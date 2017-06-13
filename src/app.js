const Vue = require('vue');
// const Promise = require('bluebird');
const Pivotal = require('pivotaljs');
const moment = require('moment');

const CONFIG_STORAGE_KEY = 'pivot-board';
const ConfigStorage = require('./lib/configStorage');
const configStorage = new ConfigStorage(CONFIG_STORAGE_KEY);

const mainChart = new window.Chartist.Line('.ct-chart', { labels: ['new'], series: [[0, 30, 60, 90, 0, 100]] });

const buildIterationGraph = (iteration) => {
  const dailyPoints = {
    labels: [],
    created: [],
    updated: [],
    accepted: [],
    burn: []
  };

  let day;

  for (day = iteration.start; day <= iteration.finish; day += 86400000) {
    dailyPoints.labels.push(moment(day).format('D MMM'));
    dailyPoints.created.push(iteration.stories.reduce((acc, story) => {
      return story.created_at <= day ? acc + (story.estimate || 0) : acc;
    }, 0));
    dailyPoints.updated.push(iteration.stories.reduce((acc, story) => {
      return story.updated_at <= day ? acc + (story.estimate || 0) : acc;
    }, 0));
    dailyPoints.accepted.push(iteration.stories.reduce((acc, story) => {
      return story.accepted_at <= day ? acc + (story.estimate || 0) : acc;
    }, 0));
  }

  let days = -1;
  for (day = iteration.finish; day >= iteration.start; day -= 86400000) {
    const weekday = moment(day).weekday();
    if (weekday > 0 && weekday < 6) {
      days++;
    }
    dailyPoints.burn.unshift(days < 0 ? 0 : days);
  }

  const totalDaysDiv = 1 / dailyPoints.burn[0];
  for (day = 0; day < dailyPoints.burn.length; day++) {
    console.log(day, dailyPoints.burn[day]);
    dailyPoints.burn[day] = dailyPoints.created[day] * dailyPoints.burn[day] * totalDaysDiv;
  }

  const data = {
    labels: dailyPoints.labels,
    series: [ dailyPoints.created, dailyPoints.updated, dailyPoints.accepted, dailyPoints.burn ]
  };
  mainChart.update(data);
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
      },
      todoStories: function () {
        return (this.stories || []).filter(function (story) {
          return ['planned', 'rejected'].includes(story.current_state);
        });
      },
      devStories: function () {
        return (this.stories || []).filter(function (story) {
          return ['started', 'finished'].includes(story.current_state);
        });
      },
      qaStories: function () {
        return (this.stories || []).filter(function (story) {
          return ['delivered'].includes(story.current_state);
        });
      },
      doneStories: function () {
        return (this.stories || []).filter(function (story) {
          return ['accepted'].includes(story.current_state);
        });
      }
    },

    methods: {
      setToken: function () {
        configStorage.save(this.config);

        this.connect();
      },
      cardStyle: function (story) {
        switch (story.current_state) {
          case 'planned': return 'card-outline-primary';
          case 'rejected': return 'card-outline-danger';
          case 'started': return 'card-outline-primary';
          case 'finished': return 'card-outline-warning';
          case 'delivered': return 'card-outline-primary';
          case 'accepted': return 'card-outline-success';
          default: return 'card-outline-secondary';
        }
      },
      disconnect: function () {
        this.connected = false;
        this.projects = undefined;
        this.stories = undefined;
        this.selectProject(undefined);
      },
      selectIteration: function (iteration) {
        console.log('Iteration', iteration);
        if (iteration) {
          this.stories = iteration.stories;

          buildIterationGraph(iteration);

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
        if (!this.config.pivotToken) {
          this.disconnect();
          return;
        }
        this.error = {};
        this.connected = true;
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
