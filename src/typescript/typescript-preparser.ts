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

import * as ts from 'typescript';

import {correctSourceRange, InlineDocInfo} from '../model/model';
import {Parser} from '../parser/parser';
import {Severity, WarningCarryingException} from '../warning/warning';

import {ParsedTypeScriptDocument} from './typescript-document';

/**
 * A TypeScript parser that only parses a single file, not imported files.
 * This parser is suitable for parsing ES6 as well.
 *
 * This parser uses a TypeScript CompilerHost that resolves all imported
 * modules to null, and resolve the standard library to an empty file.
 * Type checking against the result will be riddled with errors, but the
 * parsed AST can be used to find imports.
 *
 * This parser may eventually be replaced with a lightweight parser that
 * can find import statements, but due to the addition of the import()
 * function, it could be that a full parse is needed anyway.
 */
export class TypeScriptPreparser implements Parser<ParsedTypeScriptDocument> {
  parse(contents: string, url: string, inlineInfo?: InlineDocInfo<any>):
      ParsedTypeScriptDocument {
    const isInline = !!inlineInfo;
    inlineInfo = inlineInfo || {};
    const sourceFile =
        ts.createSourceFile(url, contents, ts.ScriptTarget.ES2016, true);
    const diagnostics =
        (sourceFile['parseDiagnostics'] || []) as ts.Diagnostic[];
    const parseError =
        diagnostics.find((d) => d.category === ts.DiagnosticCategory.Error);
    if (parseError) {
      const start = sourceFile.getLineAndCharacterOfPosition(parseError.start);
      const end = sourceFile.getLineAndCharacterOfPosition(
          parseError.start + parseError.length);
      throw new WarningCarryingException({
        code: 'parse-error',
        severity: Severity.ERROR,
        message: ts.flattenDiagnosticMessageText(parseError.messageText, '\n'),
        sourceRange: correctSourceRange(
            {
              file: url,
              start: {column: start.character, line: start.line},
              end: {column: end.character, line: end.line}
            },
            inlineInfo.locationOffset)!
      });
    }
    return new ParsedTypeScriptDocument({
      url,
      contents,
      ast: sourceFile,
      locationOffset: inlineInfo.locationOffset,
      astNode: inlineInfo.astNode, isInline,
    });
  }
}
