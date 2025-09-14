const { minify } = require("terser");
const fs = require("fs");
const glob = require("glob");

glob.sync("src/**/*.js").forEach((file) => {
  const code = fs.readFileSync(file, "utf8");
  minify(code, { compress: true, mangle: true }).then((result) => {
    fs.writeFileSync(file, result.code, "utf8");
  });
});
