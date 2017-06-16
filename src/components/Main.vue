<template>
  <div class="main">
    <div v-show="false">Loading...</div>
    <section class="serverapp" v-cloak>
      <header class="header">
        <nav class="navbar navbar-toggleable-sm navbar-light bg-faded">
          <a class="navbar-brand">Pivotal Board</a>

          <form class="form-inline" v-show="projects">
            <div class="input-group" v-show="projects">
              <span class="input-group-addon">Show</span>
              <input
                class="form-control-inline" style="text-align:center"
                type="number" v-model="iterationCount"
                min=1 max=9>
              <span class="input-group-addon">Iterations</span>
            </div>
          </form>

          <ul class="nav nav-pills" v-show="projects">
            <li class="nav-item" v-for="(project, index) in projects" :key="project.id">
              <a class="nav-link" :class="{ active: project == selectedProject }" href="#" @click="selectProject(project)">{{project.name}}</a>
            </li>
          </ul>

          <input class="form-control" v-show="!connected"
            autofocus autocomplete="off"
            placeholder="Pivotal API Token"
            v-model="config.pivotToken"
            @keyup.enter="setToken()"
          >

          <div class="ml-auto justify-content-end">
            <button class="btn btn-primary" v-show="!connected"
              type="button"
              @click="setToken()">
                Connect
            </button>

            <button class="btn btn-secondary" v-show="connected"
              type="button"
              @click="disconnect()">
                Disconnect
            </button>
          </div>
        </nav>
      </header>

      <main>
        <div class='row' v-show="!connected">
          <div class='col-sm-12'>
            <a href="https://www.pivotaltracker.com/profile">Get your API Token from your PivotalTracker Profile page</a>
          </div>
        </div>
        <div class="alert alert-danger" role="alert" v-show="error.possible_fix">
          <strong>{{ error.error}}</strong> {{ error.possible_fix}}
        </div>
        <div class="alert alert-danger" role="alert" v-show="error.message">
          <strong>{{ error.name }}</strong> {{ error.message }}
        </div>

        <div >
          <h1>Stories</h1>
          <div>
            <div class="left">
              <div class="scrum-board" v-show="stories">
                <div class="scrum-column">
                  <h2>Todo</h2>
                  <story-card :story="story" v-for="(story, index) in todoStories" :key="story.id"></story-card>
                </div>
                <div class="scrum-column">
                  <h2>Dev</h2>
                  <story-card :story="story" v-for="(story, index) in devStories" :key="story.id"></story-card>
                </div>
                <div class="scrum-column">
                  <h2>QA</h2>
                  <story-card :story="story" v-for="(story, index) in qaStories" :key="story.id"></story-card>
                </div>
                <div class="scrum-column">
                  <h2>Done</h2>
                  <story-card :story="story" v-for="(story, index) in doneStories" :key="story.id"></story-card>
                </div>
              </div>
            </div>
            <div class="right">
              <div class="ct-chart ct-square"></div>
            </div>
          </div>
        </div>
      </main>

      <!--<footer class="footer">
        <span>Footer</span>
      </footer>-->
    </section>
  </div>
</template>

<script>
import Pivotal from '../lib/pivotalJs';
import ConfigStorage from '../lib/configStorage';
import moment from 'moment';
import _ from 'lodash';
import StoryCard from '@/components/StoryCard';

const CONFIG_STORAGE_KEY = 'pivot-board';
const configStorage = new ConfigStorage(CONFIG_STORAGE_KEY);

const buildIterationGraph = (chart, iteration) => {
  const dailyPoints = {
    labels: [],
    created: [],
    updated: [],
    accepted: [],
    todo: [],
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
    dailyPoints.todo.push(
      dailyPoints.created[dailyPoints.created.length - 1] -
      dailyPoints.accepted[dailyPoints.accepted.length - 1]
    );
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
    dailyPoints.burn[day] = dailyPoints.created[day] * dailyPoints.burn[day] * totalDaysDiv;
  }

  const data = {
    labels: dailyPoints.labels,
    series: [
      dailyPoints.created,
      // dailyPoints.updated,
      // dailyPoints.accepted,
      dailyPoints.burn,
      dailyPoints.todo
    ]
  };
  chart.update(data);
};

export default {
  name: 'main',
  components: { 'story-card': StoryCard },
  data () {
    return {
      config: configStorage.load(),
      connected: false,
      pivotal: undefined,
      error: '',
      iterationCount: 1,
      mainChart: undefined,
      projects: undefined,
      stories: undefined,
      selectedProject: undefined
    };
  },
  watch: {
    iterationCount: function () {
      this.selectProject(this.selectedProject);
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
    disconnect: function () {
      this.connected = false;
      this.projects = undefined;
      this.stories = undefined;
      this.selectProject(undefined);
    },
    selectIteration: function (iteration) {
      if (iteration) {
        console.log('Iteration', iteration);
        this.stories = iteration.stories;

        buildIterationGraph(this.mainChart, iteration);
      } else {
        this.stories = undefined;
      }
    },
    selectProject: function (project) {
      this.selectedProject = project;
      this.selectIteration(undefined);
      if (project) {
        console.log('Project', project);
        this.pivotal.getIterations(project.id, {
          scope: 'done_current',
          date_format: 'millis',
          offset: 1 - this.iterationCount
        }, (iterations) => {
          if (_.isError(iterations)) {
            console.error('selectedProject', iterations);
            return;
          }
          const summary = {
            start: iterations[0].start,
            finish: iterations[0].finish,
            stories: []
          };
          iterations.forEach(function (iteration) {
            summary.start = Math.min(summary.start, iteration.start);
            summary.finish = Math.max(summary.finish, iteration.finish);
            summary.stories = summary.stories.concat(iteration.stories);
          });
          this.selectIteration(summary);
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
  updated () {
    const chartDom = document.querySelector('.ct-chart');
    if (chartDom && chartDom.__chartist__) {
      chartDom.__chartist__.update();
    }
  },
  mounted () {
    console.log('mounted');
    this.connect();
    this.mainChart = new window.Chartist.Line('.ct-chart', {
      labels: ['new'],
      series: [[0, 30, 60, 90, 0, 100]]
    }, {
      axisY: {
        onlyInteger: true
      }
    });
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}

.scrum-board {
  display: -webkit-box;
  display: -webkit-flex;
  display: -ms-flexbox;
  display: flex;
  -webkit-flex-wrap: wrap;
  -ms-flex-wrap: wrap;
  flex-wrap: wrap;
  margin-right: 0;
  margin-left: 0;
  box-sizing: inherit;
}

.scrum-column {
  position: relative;
  width: 100%;
  min-height: 1px;
  -webkit-box-flex: 0;
  -webkit-flex: 0 0 25%;
  -ms-flex: 0 0 25%;
  flex: 0 0 25%;
  max-width: 25%;
  box-sizing: inherit;
  border: 1px solid #EEEEEE
}

.left {
  position: absolute;
  left: 0;
  width: 80%;
}

.right {
  position: fixed;
  right: 0;
  width: 20%
}
</style>
