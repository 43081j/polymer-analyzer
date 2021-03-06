/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import * as estree from 'estree';

import * as astValue from '../javascript/ast-value';
import {JavaScriptDocument} from '../javascript/javascript-document';
import {ScannedBehaviorAssignment} from '../polymer/behavior';
import {Severity, Warning} from '../warning/warning';

import {analyzeProperties} from './analyze-properties';
import {ScannedPolymerElement} from './polymer-element';

export type BehaviorAssignmentOrWarning = {
  kind: 'warning',
  warning: Warning
} | {kind: 'behaviorAssignment', assignment: ScannedBehaviorAssignment};

export function getBehaviorAssignmentOrWarning(
    argNode: estree.Node,
    document: JavaScriptDocument): BehaviorAssignmentOrWarning {
  const behaviorName = astValue.getIdentifierName(argNode);
  if (!behaviorName) {
    return {
      kind: 'warning',
      warning: {
        code: 'could-not-determine-behavior-name',
        message:
            `Could not determine behavior name from expression of type ${argNode
                .type}`,
        severity: Severity.WARNING,
        sourceRange: document.sourceRangeForNode(argNode)!
      }
    };
  }
  return {
    kind: 'behaviorAssignment',
    assignment: {
      name: behaviorName,
      sourceRange: document.sourceRangeForNode(argNode)!
    }
  };
}

export type PropertyHandlers = {
  [key: string]: (node: estree.Node) => void
};


/**
 * Returns an object containing functions that will annotate `declaration` with
 * the polymer-specific meaning of the value nodes for the named properties.
 */
export function declarationPropertyHandlers(
    declaration: ScannedPolymerElement,
    document: JavaScriptDocument): PropertyHandlers {
  return {
    is(node: estree.Node) {
      if (node.type === 'Literal') {
        declaration.tagName = '' + node.value;
      }
    },
    properties(node: estree.Node) {
      for (const prop of analyzeProperties(node, document)) {
        declaration.addProperty(prop);
      }
    },
    behaviors(node: estree.Node) {
      if (node.type !== 'ArrayExpression') {
        return;
      }
      for (const element of node.elements) {
        const result = getBehaviorAssignmentOrWarning(element, document);
        if (result.kind === 'warning') {
          declaration.warnings.push(result.warning);
        } else {
          declaration.behaviorAssignments.push(result.assignment);
        }
      }
    },
    observers(node: estree.Node) {
      if (node.type !== 'ArrayExpression') {
        return;
      }
      for (const element of node.elements) {
        let v = astValue.expressionToValue(element);
        if (v === undefined) {
          v = astValue.CANT_CONVERT;
        }
        declaration.observers.push({javascriptNode: element, expression: v});
      }
    },
    listeners(node: estree.Node) {

      if (node.type !== 'ObjectExpression') {
        declaration.warnings.push({
          code: 'invalid-listeners-declaration',
          message: '`listeners` property should be an object expression',
          severity: Severity.ERROR,
          sourceRange: document.sourceRangeForNode(node)!
        });
        return;
      }

      for (const p of node.properties) {
        const evtName = p.key.type === 'Literal' && p.key.value ||
            p.key.type === 'Identifier' && p.key.name;
        const handler = p.value.type !== 'Literal' || p.value.value;

        if (typeof evtName !== 'string' || typeof handler !== 'string') {
          // TODO (maklesoft): Notifiy the user somehow that a listener entry
          // was not extracted
          // because the event or handler namecould not be statically analyzed.
          // E.g. add a low-severity
          // warning once opting out of rules is supported.
          continue;
        }

        declaration.listeners.push({event: evtName, handler: handler});
      }
    }
  };
}
