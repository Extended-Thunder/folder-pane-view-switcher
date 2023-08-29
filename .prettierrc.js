module.exports = {
    tabWidth: 4,
    singleQuote: false,
    trailingComma: "none",
    endOfLine: "lf",
    overrides: [
        {
            files: "*.xul",
            options: { parser: "html" }
        }
    ]
};
