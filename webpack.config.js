const path = require("path");

module.exports = {
  mode: "production",
  entry: {
    sw: path.resolve(__dirname, "sw.js"),
  },
  output: {
    path: __dirname,
    filename: "[name].dist.js",
  },
  plugins: [],
};
