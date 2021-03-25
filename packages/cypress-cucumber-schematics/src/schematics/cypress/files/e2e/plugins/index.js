//  const { addMatchImageSnapshotPlugin } = require('cypress-image-snapshot/plugin');
const webpack = require('cypress-webpack-preprocessor-v5');

module.exports = on => {
    const options = {
        webpackOptions: require('./webpack.config.js')
    };
    on('file:preprocessor', webpack(options));
};
