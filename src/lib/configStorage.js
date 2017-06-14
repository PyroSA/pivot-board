function ConfigStorage (configKey) {
  this._configKey = configKey;
}

ConfigStorage.prototype.load = function () {
  const config = JSON.parse(localStorage.getItem(this._configKey) || '{ "pivotToken": "" }');
  return config;
};

ConfigStorage.prototype.save = function (config = {}) {
  localStorage.setItem(this._configKey, JSON.stringify(config));
};

export default ConfigStorage;
