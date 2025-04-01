import 'bootstrap';
import i18next from 'i18next';
import * as yup from 'yup';
import _ from 'lodash';
import axios from 'axios';

import resources from './locales/index.js';
import watcher from './watcher.js';
import local from './locales/local.js';
import parse from './rss.js';

const addProxy = (url) => {
  const urlProxy = new URL('/get', 'https://allorigins.hexlet.app');
  urlProxy.searchParams.set('url', url);
  urlProxy.searchParams.set('disableCache', 'true');
  return urlProxy.toString();
};

const getLoadingProcessError = (e) => {
  if (e.isParsingError) {
    return 'noRss';
  }
  if (e.isAxiosError) {
    return 'network';
  }
  return 'unknow';
};

const fetchNewPosts = (watchedState) => {
  const promises = watchedState.feeds.map((feed) => {
    const urlWithProxy = addProxy(feed.url);
    return axios.get(urlWithProxy)
      .then((response) => {
        const feedData = parse(response.data.contents);
        const newPosts = feedData.items.map((item) => ({ ...item, channelId: feed.id }));
        const oldPosts = watchedState.posts.filter((post) => post.channelId === feed.id);
        const posts = _.differenceWith(newPosts, oldPosts, (p1, p2) => p1.title === p2.title)
          .map((post) => ({ ...post, id: _.uniqueId() }));
        watchedState.posts.unshift(...posts);
      })
      .catch((e) => {
        console.error(e);
      });
  });
  Promise.all(promises).finally(() => {
    setTimeout(() => fetchNewPosts(watchedState), 5000);
  });
};

const loadRss = (watchedState, url) => {
  watchedState.loadingProcess.status = 'loading'; // eslint-disable-line no-param-reassign
  const urlProxy = addProxy(url);
  return axios.get(urlProxy)
    .then((response) => {
      const data = parse(response.data.contents);

      const feed = {
        url, id: _.uniqueId(), title: data.title, description: data.description,
      };
      const posts = data.items.map((item) => ({ ...item, channelId: feed.id, id: _.uniqueId() }));

      watchedState.posts.unshift(...posts);
      watchedState.feeds.unshift(feed);

      watchedState.loadingProcess.error = null; // eslint-disable-line no-param-reassign
      watchedState.loadingProcess.status = 'idle'; // eslint-disable-line no-param-reassign
      watchedState.form = { // eslint-disable-line no-param-reassign
        ...watchedState.form,
        status: 'filling',
        error: null,
      };
    })
    .catch((e) => {
      console.log(e);
      // eslint-disable-next-line max-len
      watchedState.loadingProcess.error = getLoadingProcessError(e); // eslint-disable-line no-param-reassign
      watchedState.loadingProcess.status = 'failed'; // eslint-disable-line no-param-reassign
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
    },
    uiState: {
      modal: {
        postId: null,
      },
      seenPosts: new Set(),
    },
  };

  const elements = {
    form: document.querySelector('.rss-form'),
    input: document.querySelector('.rss-form input'),
    feedback: document.querySelector('.feedback'),
    submit: document.querySelector('.rss-form button[type="submit"]'),
    feedsBox: document.querySelector('.feeds'),
    postsBox: document.querySelector('.posts'),
    modal: document.querySelector('#modal'),

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
                error,
                valid: false,
              };
            }
          });
      });

      elements.postsBox.addEventListener('click', (event) => {
        if (!('id' in event.target.dataset)) {
          return;
        }

        const { id } = event.target.dataset;
        watchedState.uiState.modal.postId = String(id);
        watchedState.uiState.seenPosts.add(id);
      });

      setTimeout(() => fetchNewPosts(watchedState), 5000);
    });

  return promise;
};
