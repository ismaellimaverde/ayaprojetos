import { summarySchema, type SummaryDocument } from "./rich-summary";
// Only validated nodes and fixed styles enter the isolated print document. No HTML interpolation.
export function printSummary(input: SummaryDocument, title: string) {
  const value = summarySchema.parse(input);
  document.querySelector("iframe[data-boss-print]")?.remove();
  const frame = document.createElement("iframe");
  frame.dataset.bossPrint = "true";
  frame.title = "Documento para exportar PDF";
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;width:1px;height:1px;left:-10000px;border:0";
  document.body.append(frame);
  const doc = frame.contentDocument!;
  doc.title = title;
  const style = doc.createElement("style");
  style.textContent =
    "@page{size:A4;margin:20mm}body{font:12pt Arial;color:#1d1e21}h1{font-size:22pt}h2{font-size:18pt}h3{font-size:15pt}h1,h2,h3{break-after:avoid}p{line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}a{color:#1d1e21;text-decoration:underline}header{font-size:10pt;border-bottom:1px solid #ef9c83;padding-bottom:12px;margin-bottom:24px}";
  doc.head.append(style);
  const header = doc.createElement("header");
  header.textContent = `AYA Projetos · BOSS · Business Operation Sales System — ${title}`;
  doc.body.append(header);
  for (const block of value.content) {
    const el = doc.createElement(
      block.type === "heading" ? `h${block.attrs.level}` : "p",
    );
    if (block.attrs?.textAlign) el.style.textAlign = block.attrs.textAlign;
    for (const node of block.content ?? []) {
      if (node.type === "hardBreak") {
        el.append(doc.createElement("br"));
        continue;
      }
      let child: Node = doc.createTextNode(node.text);
      for (const mark of node.marks ?? []) {
        const wrapper = doc.createElement(
          mark.type === "bold"
            ? "strong"
            : mark.type === "italic"
              ? "em"
              : mark.type === "underline"
                ? "u"
                : mark.type === "strike"
                  ? "s"
                  : mark.type === "link"
                    ? "a"
                    : "span",
        );
        if (mark.type === "textStyle") {
          if (mark.attrs.fontFamily)
            wrapper.style.fontFamily = mark.attrs.fontFamily;
          if (mark.attrs.fontSize) wrapper.style.fontSize = mark.attrs.fontSize;
        }
        if (mark.type === "link") wrapper.setAttribute("href", mark.attrs.href);
        wrapper.append(child);
        child = wrapper;
      }
      el.append(child);
    }
    if (!el.childNodes.length) el.append(doc.createElement("br"));
    doc.body.append(el);
  }
  // Keep until the next export; removing immediately can truncate asynchronous mobile printing.
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
}
