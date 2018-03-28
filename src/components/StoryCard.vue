<template>
  <div class="card">
    <div class="card-body">
      <div class="card-title">
        <a class="left" :href="story.url">{{story.id}}</a>
        <span :class="cardGlyph(story)"></span>
        <span class="right badge badge-primary" v-show="story.estimate">{{story.estimate}}</span>
        <span class="right badge badge-primary" v-show="!story.estimate">-</span>
      </div>
      <p class="card-text">{{story.name}}</p>
      <div></div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'story-card',
  props: [
    'story'
  ],
  data () {
    return {
    };
  },
  methods: {
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
    cardGlyph: function (story) {
      switch (story.story_type) {
        case 'bug': return 'fas fa-bug';
        case 'chore': return 'fas fa-cog';
        case 'feature': return 'fas fa-star';
        case 'release': return 'fas fa-flag-checkered';
        default: return 'fas fa-question';
      }
    }
  },
  mounted () {
  }
};
</script>

<style scoped>
a {
  color: #42b983;
}

.card {
  display: block;
  margin: 0.2rem;
  page-break-inside: avoid;
  min-height: 8em
}

.card-body {
  text-align: center;
  padding: 0.5rem;
}

.card-title {
  width: 100%;
  margin-bottom: 0;
  line-height: 1.0;
}

.card-text {
  margin-bottom: 0;
}

.col-border {
  border: 1px solid #EEEEEE;
}

.left {
  float: left;
}

.right {
  float: right;
}

@media print {
  .card {
    border-radius: 0%;
    border: 1px solid black;
    page-break-inside: avoid;
    display: inline-table;
    margin: 0.0rem;
    width: 33%;
    max-width: 33%;
  }
  .card-text {
    margin-top: 0.2rem;
  }
}

</style>
