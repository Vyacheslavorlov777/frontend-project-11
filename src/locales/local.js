export default {
  string: {
    url: () => 'notUrl',
  },
  mixed: {
    required: () => 'empty',
    notOneOf: () => 'exist',
  },
};
