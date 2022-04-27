module.exports = {
    tabWidth: 4,
    singleQuote: false,
    trailingComma: "none",
    overrides: [
        {
            files: "*.xul",
            options: { parser: "html" }
        }
    ]
};
