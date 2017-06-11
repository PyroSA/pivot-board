const Vue = require('vue');
const Promise = require('bluebird');
const Pivotal = require('pivotaljs');

const CONFIG_STORAGE_KEY = 'pivot-board';
const ConfigStorage = require('./lib/configStorage');
const configStorage = new ConfigStorage(CONFIG_STORAGE_KEY);

const CHECK_FREQUENCY = 30000;
const CHECK_SEPERATION = 1000;

const mainChart = new window.Chartist.Line('.ct-chart', { labels: ['new'], series: [[0, 30, 60, 90, 0, 100]] });

const updateGraphs = (servers, graphs, element = 'rtt') => {
  const data = {
    labels: servers.map((server) => server.name),
    series: graphs.map((graph) => graph[element])
  };
  mainChart.update(data);
};

const inhumanize = (input) => {
  return input.toString().replace('GB', 'e9').replace('MB', 'e6').replace('MB', 'e3');
};

const calculateGraphs = (responses, graph) => {
  graph.rtt = responses.map((response) => response.rtt);
  graph.cpu = responses.map((response) => response.os.load['1m']);
  graph.memFree = responses.map((response) => inhumanize(response.os.mem.free));
  graph.memRss = responses.map((response) => inhumanize(response.process.mem.rss));
  graph.memProc = responses.map((response) => inhumanize(response.process.mem.used));
};

var app = function () {
  return new Vue({
    el: '#app',
    components: {
    },
    data: {
      config: configStorage.load(),
      connected: false,
      pivotal: undefined,
      error: '',
      projects: undefined,
      stories: undefined,
      selectedProject: undefined
    },
    watch: {
      servers: {
        handler: function (servers) {
          configStorage.save(servers);
        },
        deep: true
      }
    },
    filters: {
      pluralize: function (n) {
        return n === 1 ? 'server' : 'servers';
      }
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
        this.projects = undefined;
        this.stories = undefined;
        this.selectProject(undefined);
      },
      selectIteration: function (iteration) {
        console.log(iteration);
        if (iteration) {
          this.stories = iteration.stories;

          const storyCount = {};
          this.stories.forEach(function (story) {
            storyCount[story.current_state] = (storyCount[story.current_state] || 0) + 1;
          });
          console.log(storyCount);
        } else {
          this.stories = undefined;
        }
      },
      selectProject: function (project) {
        console.log('Project', project);
        this.selectedProject = project;
        this.selectIteration(undefined);
        if (project) {
          this.pivotal.getCurrentIterations(project.id, (err, iterations) => {
            if (err) {
              console.error('selectedProject', err);
              return;
            }
            this.selectIteration(iterations[0]);
          });
        }
      },
      connect: function () {
        this.error = {};
        this.connected = true;
        console.log('connecting');
        this.pivotal = new Pivotal(this.config.pivotToken);
        this.pivotal.getProjects((err, projects) => {
          if (err || projects.error) {
            this.error = err || projects;
            console.error(this.error);
            this.disconnect();
            return;
          }
          if (projects && projects.length > 0) {
            console.log(projects);
            this.projects = projects;
            this.selectProject(projects[0]);
          }
        });
      }
    },
    mounted: function () {
      this.connect();
    }
  });
};

module.exports = app;
