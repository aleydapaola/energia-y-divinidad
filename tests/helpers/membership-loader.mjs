import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");
export function loadMembership(relative, dependencies = {}) {
  const filename = new URL("../../" + relative, import.meta.url).pathname;
  const mod = new Module(filename);
  mod.require = (name) => {
    if (Object.hasOwn(dependencies, name)) {
      return dependencies[name];
    }
    if (name === "next/server") {
      return { NextResponse: { json: Response.json, redirect: (url) => Response.redirect(url) } };
    }
    if (name.startsWith("./")) {
      return loadMembership(
        path.relative(
          new URL("../../", import.meta.url).pathname,
          path.resolve(path.dirname(filename), name + ".ts")
        ),
        dependencies
      );
    }
    if (name.startsWith("@/")) {
      throw new Error("Unexpected dependency " + name);
    }
    return require(name);
  };
  mod._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    filename
  );
  return mod.exports;
}
