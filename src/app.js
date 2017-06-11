const Vue = require('vue');
const Promise = require('bluebird');
const Pivotal = require('pivotaljs');

const CONFIG_STORAGE_KEY = 'pivot-board';
const ConfigStorage = require('./lib/configStorage');
const configStorage = new ConfigStorage(CONFIG_STORAGE_KEY);

var app = function () {
  return new Vue({
    el: '#app',
    components: {
    },
    data: {
      projects: [],
      pivotal: null,
      config: configStorage.load(),
      connected: false
    },
    computed: {
      monitoring: function () {
        return this.config.connect;
      }
    },

    methods: {
      setToken: function () {
        configStorage.save(this.config);

        this.connect();
      },
      disconnect: function () {
        this.connected = false;
      },
      connect: function () {
        this.connected = true;
        this.projects = [];
        console.log('connecting');
        this.pivotal = new Pivotal(this.config.pivotToken);
        this.pivotal.getProjects((err, projects) => {
          if (err) {
            console.error(err);
            this.connected = false;
            return;
          }
          if (projects.error) {
            console.error(projects);
            this.connected = false;
            return;
          }
          console.log(projects);
          this.projects = projects;
          this.connected = true;
        });
      }
    },
    mounted: function () {
      this.connect();
    }
  });
};

module.exports = app;
