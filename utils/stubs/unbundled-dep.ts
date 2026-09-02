// Stand-in for heavy optional dependencies (html2canvas / canvg) that jspdf
// only imports from its unused .html() API. Keeps ~200KB out of the bundle.
function missingOptionalDependency(): never {
  throw new Error('This optional dependency is not bundled.');
}

export default missingOptionalDependency;
