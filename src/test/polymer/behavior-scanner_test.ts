/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
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


import {assert} from 'chai';
import * as fs from 'fs';
import * as path from 'path';


import {Visitor} from '../../javascript/estree-visitor';
import {JavaScriptDocument} from '../../javascript/javascript-document';
import {JavaScriptParser} from '../../javascript/javascript-parser';
import {ScannedFeature} from '../../model/model';
import {ScannedBehavior} from '../../polymer/behavior-descriptor';
import {BehaviorScanner} from '../../polymer/behavior-scanner';

suite('BehaviorScanner', () => {

  let document: JavaScriptDocument;
  let behaviors: Map<string, ScannedBehavior>;
  let behaviorsList: ScannedBehavior[];

  suiteSetup(() => {
    let parser = new JavaScriptParser({sourceType: 'script'});
    let file = fs.readFileSync(
        path.resolve(__dirname, '../static/js-behaviors.js'), 'utf8');
    document = parser.parse(file, '/static/js-behaviors.js');
    let scanner = new BehaviorScanner();
    let visit = (visitor: Visitor) =>
        Promise.resolve(document.visit([visitor]));

    return scanner.scan(document, visit).then((features: ScannedFeature[]) => {
      behaviors = new Map();
      behaviorsList = <ScannedBehavior[]>features.filter(
          (e) => e instanceof ScannedBehavior);
      for (let behavior of behaviorsList) {
        behaviors.set(behavior.className, behavior);
      }
    });
  });

  test('Finds behavior object assignments', () => {
    assert.deepEqual(behaviorsList.map(b => b.className).sort(), [
      'SimpleBehavior', 'AwesomeBehavior', 'Really.Really.Deep.Behavior',
      'CustomBehaviorList'
    ].sort());
  });

  test('Supports behaviors at local assignments', () => {
    assert(behaviors.has('SimpleBehavior'));
    assert.equal(behaviors.get('SimpleBehavior').properties[0].name, 'simple');
  });

  test('Supports behaviors with renamed paths', () => {
    assert(behaviors.has('AwesomeBehavior'));
    assert(behaviors.get('AwesomeBehavior')
               .properties.some((prop) => prop.name === 'custom'));
  });

  test('Supports behaviors On.Property.Paths', () => {
    assert(behaviors.has('Really.Really.Deep.Behavior'));
    assert.equal(
        behaviors.get('Really.Really.Deep.Behavior').properties[0].name,
        'deep');
  });

  test('Supports property array on behaviors', () => {
    let defaultValue: any;
    behaviors.get('AwesomeBehavior').properties.forEach((prop) => {
      if (prop.name === 'a') {
        defaultValue = prop.default;
      }
    });
    assert.equal(defaultValue, 1);
  });

  test('Supports chained behaviors', function() {
    assert(behaviors.has('CustomBehaviorList'));
    let childBehaviors = behaviors.get('CustomBehaviorList').behaviors;
    assert.deepEqual(
      childBehaviors.map((bval) => bval.name),
      ['SimpleBehavior', 'CustomNamedBehavior', 'Really.Really.Deep.Behavior']);
    assert.deepEqual(
      behaviors.get('Really.Really.Deep.Behavior').behaviors.map((bval) => bval.name),
      ['Do.Re.Mi.Fa']);
  });

});
