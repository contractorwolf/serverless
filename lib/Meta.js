'use strict';

/**
 * Serverless Meta Class
 */

const SError       = require('./Error'),
  SUtils           = require('./utils/index'),
  BbPromise        = require('bluebird'),
  path             = require('path'),
  fs               = require('fs'),
  _                = require('lodash');

class ServerlessMeta
{

  /**
   * Constructor
   */

  constructor(Serverless) {
    this._S       = Serverless;

    // Default properties
    this.stages    = {};
    this.variables = {};

  }

  /**
   * Load
   * - Load from source (i.e., file system);
   */

  load() {

    let _this = this;

    return BbPromise.try(function() {

      // Validate: Check project path is set
      if (!_this._S.hasProject()) throw new SError('No project path has been set on Serverless instance');

      // Validate: Check variables exist
      if (SUtils.dirExistsSync(_this._S.getProject().getFilePath('_meta', 'variables'))) {

        let variableFiles = fs.readdirSync(_this._S.getProject().getFilePath('_meta', 'variables'));

        for (let i = 0; i < variableFiles.length; i++) {

          // Skip unrelated and hidden files
          if (!variableFiles[i] || variableFiles[i].charAt(0) === '.' || variableFiles[i].indexOf('s-variables') == -1) continue;

          // Parse file name to get stage/region
          let file = variableFiles[i].replace('s-variables-', '').replace('.json', '');

          if (file === 'common') {

            // Set Common variables
            _this.variables = SUtils.readAndParseJsonSync(_this._S.getProject().getFilePath('_meta', 'variables', variableFiles[i]));

          } else {

            // Set Stage/Region variables
            file = file.split('-');
            if (!_this.stages[file[0]]) _this.stages[file[0]] = {
              regions: {},
              variables: {}
            };

            if (file.length === 1) {

              // Set Stage Variables
              _this.stages[file[0]].variables = SUtils.readAndParseJsonSync(_this._S.getProject().getFilePath('_meta', 'variables', variableFiles[i]));

            } else if (file.length === 2) {

              // Set Stage-Region Variables
              let region;
              if (file[1] === 'useast1')      region = 'us-east-1';
              if (file[1] === 'uswest2')      region = 'us-west-2';
              if (file[1] === 'euwest1')      region = 'eu-west-1';
              if (file[1] === 'apnortheast1') region = 'ap-northeast-1';
              if (!_this.stages[file[0]].regions[region]) _this.stages[file[0]].regions[region] = {
                variables: SUtils.readAndParseJsonSync(_this._S.getProject().getFilePath('_meta', 'variables', variableFiles[i]))
              };
            }
          }
        }
      }

      return _this;

    });
  }

  /**
   * Set
   * - Returns clone of data
   */

  set(data) {
    this.stages    = _.extend(this.stages, data.stages);
    this.variables = _.extend(this.variables, data.variables);
    return this;
  }

  /**
   * Get
   * - Returns clone of data
   */

  get() {
    return {
      stages:    _.cloneDeep(this.stages),
      variables: _.cloneDeep(this.variables)
    }
  }

  /**
   * Save
   * - persist data
   */

  save() {

    let _this = this,
      clone   = this.get();

    return BbPromise.try(function() {

      // Validate: Check project path is set
      if (!_this._S.hasProject()) throw new SError('Meta could not be saved because no project path has been set on Serverless instance');

      // Create meta folder if does not exist
      if (!SUtils.dirExistsSync(_this._S.getProject().getFilePath('_meta'))) {
        fs.mkdirSync(_this._S.getProject().getFilePath('_meta'));
      }

      // Create meta/resources folder, if does not exist
      if (!SUtils.dirExistsSync(_this._S.getProject().getFilePath('_meta', 'resources'))) {
        fs.mkdirSync(_this._S.getProject().getFilePath('_meta', 'resources'));
      }

      // Create meta/variables folder, if does not exist
      if (!SUtils.dirExistsSync(_this._S.getProject().getFilePath('_meta', 'variables'))) {
        fs.mkdirSync(_this._S.getProject().getFilePath('_meta', 'variables'));
      }

      // Save Common Variables
      fs.writeFileSync(_this._S.getProject().getFilePath('_meta', 'variables', 's-variables-common.json'),
        JSON.stringify(clone.variables, null, 2));

      // Save Stage & Region Variables
      for (let i = 0; i < Object.keys(clone.stages).length; i++) {

        let stage = clone.stages[Object.keys(clone.stages)[i]];

        // Save Stage Variables
        fs.writeFileSync(_this._S.getProject().getFilePath('_meta', 'variables', 's-variables-' + Object.keys(clone.stages)[i] + '.json'),
          JSON.stringify(stage.variables, null, 2));

        // Save Stage Region Variables
        for (let j = 0; j < Object.keys(stage.regions).length; j++) {
          fs.writeFileSync(_this._S.getProject().getFilePath('_meta', 'variables', 's-variables-' + Object.keys(clone.stages)[i] + '-' + Object.keys(stage.regions)[j].replace(/-/g, '') + '.json'),
            JSON.stringify(stage.regions[Object.keys(stage.regions)[j]].variables, null, 2));
        }
      }
    });
  }
}

module.exports = ServerlessMeta;