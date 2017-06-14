<template>
  <div class="hello">
    <div v-show="false">Loading...</div>
    <section class="serverapp" v-cloak>
      <header class="header">
        <nav class="navbar navbar-toggleable-sm navbar-light bg-faded">
          <h1 class="navbar-brand">Pivotal Board</h1>

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

        <div v-show="stories">
          <h1>Stories</h1>
          <div class="row">
            <div class="col-sm-3">
              <h2>Todo</h2>
              <div class="card" v-for="(story, index) in todoStories" :key="story.id" :class="cardStyle(story)">
                <div class="card-block">
                  <h4 class="card-title">{{story.story_type}}
                    <span class="badge badge-primary" v-show="story.estimate">{{story.estimate}}</span>
                    <a :href="story.url">{{story.id}}</a>
                  </h4>
                  <p class="card-text">{{story.name}}</p>
                  <div></div>
                </div>
              </div>
            </div>
            <div class="col-sm-3">
              <h2>Dev</h2>
              <div class="card" v-for="(story, index) in devStories" :key="story.id" :class="cardStyle(story)">
                <div class="card-block">
                  <h4 class="card-title">{{story.story_type}}
                    <span class="badge badge-primary" v-show="story.estimate">{{story.estimate}}</span>
                    <a :href="story.url">{{story.id}}</a>
                  </h4>
                  <p class="card-text">{{story.name}}</p>
                  <div></div>
                </div>
              </div>
            </div>
            <div class="col-sm-3">
              <h2>QA</h2>
              <div class="card" v-for="(story, index) in qaStories" :key="story.id" :class="cardStyle(story)">
                <div class="card-block">
                  <h4 class="card-title">{{story.story_type}}
                    <span class="badge badge-info" v-show="story.estimate">{{story.estimate}}</span>
                    <a :href="story.url">{{story.id}}</a>
                  </h4>
                  <p class="card-text">{{story.name}}</p>
                  <div></div>
                </div>
              </div>
            </div>
            <div class="col-sm-3">
              <h2>Done</h2>
              <div class="card" v-for="(story, index) in doneStories" :key="story.id" :class="cardStyle(story)">
                <div class="card-block">
                  <h4 class="card-title">{{story.story_type}}
                    <span class="badge badge-primary" v-show="story.estimate">{{story.estimate}}</span>
                    <a :href="story.url">{{story.id}}</a>
                  </h4>
                  <p class="card-text">{{story.name}}</p>
                  <div></div>
                </div>
              </div>
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

const CONFIG_STORAGE_KEY = 'pivot-board';
const configStorage = new ConfigStorage(CONFIG_STORAGE_KEY);

const mainChart = new window.Chartist.Line('.ct-chart', { labels: ['new'], series: [[0, 30, 60, 90, 0, 100]] });

const buildIterationGraph = (iteration) => {
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
    console.log(day, dailyPoints.burn[day]);
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
  mainChart.update(data);
};

export default {
  name: 'hello',
  data () {
    return {
      config: configStorage.load(),
      connected: false,
      pivotal: undefined,
      error: '',
      projects: undefined,
      stories: undefined,
      selectedProject: undefined
    };
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
        // this.pivotal.getCurrentIterations(project.id, (err, iterations) => {
        //   console.log('cb');
        //   if (err) {
        //     console.error('selectedProject', err);
        //     return;
        //   }
        //   const all = {
        //     start: iterations[0].start,
        //     finish: iterations[0].finish,
        //     stories: []
        //   };
        //   iterations.forEach(function (iteration) {
        //     console.log(all);
        //     console.log(iteration);
        //     all.start = Math.min(all.start, iteration.start);
        //     all.finish = Math.max(all.finish, iteration.finish);
        //     all.stories = all.stories.concat(iteration.stories);
        //   });
        //   this.selectIteration(all);
        // });

        this.pivotal.getIterations(project.id, { scope: 'done_current', date_format: 'millis', offset: -3 }, (iterations) => {
          console.log('comp', iterations);
          if (_.isError(iterations)) {
            console.error('selectedProject', iterations);
            return;
          }
          const all = {
            start: iterations[0].start,
            finish: iterations[0].finish,
            stories: []
          };
          iterations.forEach(function (iteration) {
            console.log(all);
            console.log(iteration);
            all.start = Math.min(all.start, iteration.start);
            all.finish = Math.max(all.finish, iteration.finish);
            all.stories = all.stories.concat(iteration.stories);
          });
          this.selectIteration(all);
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
  mounted () {
    this.disconnect();
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
</style>
