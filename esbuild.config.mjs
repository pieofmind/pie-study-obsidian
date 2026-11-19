/* Build: main.js (TS + ảnh Pie Bot nhúng) + styles.css (CSS prototype bọc trong .pie-study-root, font Be Vietnam Pro nhúng). */
import esbuild from "esbuild";
import builtins from "builtin-modules";
import { readFileSync, writeFileSync } from "fs";

const FONT = "node_modules/@fontsource/be-vietnam-pro";
function fonts(weights = [400, 500, 600, 700, 800, 900]) {   // subset vietnamese + latin-ext + latin, woff2 nhúng base64 → không gọi mạng
  return weights.map(w => readFileSync(`${FONT}/${w}.css`, "utf8")
    .replace(/, url\([^)]+\.woff\) format\('woff'\)/g, "")
    .replace(/url\(\.\/files\/([^)]+\.woff2)\)/g, (_, f) => `url(data:font/woff2;base64,${readFileSync(`${FONT}/files/${f}`).toString("base64")})`)).join("\n");
}
/** Tách @keyframes ra ngoài (không lồng được), phần còn lại bọc trong .pie-study-root { … } để không rò ra giao diện Obsidian. */
function scope(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const top = []; let out = "", k = 0;
  while (k < css.length) {
    const at = css.indexOf("@keyframes", k);
    if (at < 0) { out += css.slice(k); break; }
    out += css.slice(k, at);
    let j = css.indexOf("{", at), depth = 0;
    for (; j < css.length; j++) { if (css[j] === "{") depth++; else if (css[j] === "}" && --depth === 0) break; }
    top.push(css.slice(at, j + 1)); k = j + 1;
  }
  return top.join("\n") + `\n.pie-study-root {\n${out}\n}\n`;
}
async function styles() {
  const src = ["src/styles/proto-reset.css", "src/styles/proto-base.css", "src/styles/proto-quest.css", "src/styles/proto-badges.css", "src/styles/proto-d2.css", "src/styles/proto-d4.css", "src/styles/proto-d5.css", "src/styles/proto-d6.css", "src/styles/proto-d7.css", "src/styles/proto-d8.css", "src/styles/proto-d9.css", "src/styles/proto-d10.css", "src/styles/proto-d11.css", "src/styles/plugin.css"].map(f => readFileSync(f, "utf8")).join("\n");
  const r = await esbuild.transform(scope(src), { loader: "css", target: ["chrome108", "safari15"], minify: false });
  const lic = "/* Be Vietnam Pro — SIL Open Font License 1.1 (fontsource). */\n";
  writeFileSync("styles.css", `/* Pie Study — bundled. Đừng sửa file này; nguồn ở src/styles/. */\n${lic}${fonts()}\n.pie-study-host { padding: 0 !important; overflow: hidden !important; }\n.pie-study-root { height: 100%; }\n${r.code}`);
}
/** Thư viện cho khối visual (spec 7.8): import "lib:<tên>" → mã min dạng chuỗi, chỉ chèn vào bài giảng khi khối xin (data-libs). */
const LIBS = { d3: "node_modules/d3/dist/d3.min.js" };
const libText = { name: "lib-text", setup(b) {
  b.onResolve({ filter: /^lib:/ }, a => ({ path: a.path.slice(4), namespace: "lib" }));
  b.onLoad({ filter: /.*/, namespace: "lib" }, a => ({ contents: readFileSync(LIBS[a.path], "utf8").replace(/^\/\/ https:\/\/d3js\.org /, "// d3 "), loader: "text" }));   // giữ dòng bản quyền (ISC), bỏ URL để bản build không có địa chỉ mạng
} };
await esbuild.build({
  plugins: [libText],
  entryPoints: ["src/main.ts"], bundle: true, external: ["obsidian", "electron", ...builtins], format: "cjs", target: "es2021",
  loader: { ".png": "dataurl", ".svg": "text", ".html": "text", ".md": "text" }, outfile: "main.js", minify: process.argv[2] === "production", logLevel: "info",
});
await styles();
/* Mẫu bài giảng cho agent (spec 7.3): file tự chứa, font nhúng sẵn — iframe cách ly + CSP không tải được font ngoài. Ship cạnh main.js. */
writeFileSync("lecture-template.html", readFileSync("src/lecture-template.html", "utf8").replace("<!--PIE-STUDY-FONTS-->", `<style>${fonts([500, 600, 700, 800, 900])}</style>`));
