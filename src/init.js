import 'bootstrap';
import i18next from 'i18next';
import * as yup from 'yup';
import _ from 'lodash';
import axios from 'axios';

import resources from './locales/index.js';
import watcher from './watcher.js';
import local from './locales/local.js';
import parse from './rss.js'

const addProxy = (url) => {
  const urlProxy = new URL('/get', 'https://allorigins.hexlet.app');
  urlProxy.searchParams.set('url', url);
  return urlProxy.toString();
}

const getLoadingProcessError = (e) => {
  if (e.isParsingError) {
    return 'noRss'
  }
  if (e.isAxiosError) {
    return 'network'
  }
  return 'unknow';
}

const loadRss = (watchedState, url) => {
  watchedState.loadingProcess.status = 'loading';
  const urlProxy = addProxy(url);
  return axios.get(urlProxy)
    .then((response) => {
      const data = parse(response.data.contents);
      
      const feed = {
        url, id: _.uniqueId(), title: data.title, description: data.description
      };
      const posts = data.items.map((item) => ({ ...item, channelId: feed.id, id: _.uniqueId() }));
      
      watchedState.posts.unshift(...posts);
      watchedState.feeds.unshift(feed);
      console.log(watchedState.feeds);
      console.log(watchedState.posts);

      watchedState.loadingProcess.error = null;
      watchedState.loadingProcess.status = 'idle';
      watchedState.form = {
        ...watchedState.form,
        status: 'filling',
        error: null,
      };
    })
    .catch((e) => {
      console.log(e);
      watchedState.loadingProcess.error = getLoadingProcessError(e);
      watchedState.loadingProcess.status = 'failed';
    });
};


export default () => {
  const initState = {
    feeds: [],
    posts: [],
    form: {
      error: null,
      valid: false,
      status: 'filling',
    },
    loadingProcess: {
      status: 'idle',
      error: null,
    }
  };

  const elements = {
    form: document.querySelector('.rss-form'),
    input: document.querySelector('.rss-form input'),
    feedback: document.querySelector('.feedback'),
    submit: document.querySelector('.rss-form button[type="submit"]'),
    feedsBox: document.querySelector('.feeds'),
    postsBox: document.querySelector('.posts'),

  };

  const i18nextInstance = i18next.createInstance();

  const promise = i18nextInstance.init({
    lng: 'ru',
    resources,
  })
    .then(() => {
      yup.setLocale(local);
      const validateUrl = (url, feeds) => {
        const feedUrl = feeds.map((feed) => feed.url);
        const schema = yup.string().url().required().notOneOf(feedUrl);
        
        return schema.validate(url)
          .then(() => null)
          .catch((error) => error.message);
      };

      const watchedState = watcher(initState, elements, i18nextInstance);

      elements.form.addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(event.target);
        const url = data.get('url');
        
        validateUrl(url, watchedState.feeds)
          .then((error) => {
            if (!error) {
              watchedState.form = {
                ...watchedState.form,
                error: null,
                valid: true,
              };
              loadRss(watchedState, url);
            } else {
              watchedState.form = {
                ...watchedState.form,
                error: error,
                valid: false,
              };
            }
          });
      });
    });
    
  return promise;
};
