import { terser } from "rollup-plugin-terser";

export default [
    {
        input: 'src/index.js',
        output: {
            extend: true,
            file: 'dist/simple-db-scheme.js',
            format: 'umd',
            indent: false,
            name: 'simpleDbScheme',
        },
        external: ['d3'],
    }, {
        input: 'src/index.js',
        output: {
            extend: true,
            file: 'dist/simple-db-scheme.min.js',
            format: 'umd',
            indent: false,
            name: 'simpleDbScheme',
        },
        plugins: [
            terser(),
        ],
        external: ['d3'],
    },
];
