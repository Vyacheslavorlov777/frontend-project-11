import 'bootstrap';
import i18next from 'i18next';
import * as yup from 'yup';

import resources from './locales/index.js';
import watcher from './watcher.js';
import local from './locales/local.js';

export default () => {
  const initState = {
    feeds: [],
    posts: [],
    form: {
      error: null,
      valid: false,
      status: 'filling',
    },
  };

  const elements = {
    form: document.querySelector('.rss-form'),
    input: document.querySelector('.rss-form input'),
    feedback: document.querySelector('.feedback'),
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
