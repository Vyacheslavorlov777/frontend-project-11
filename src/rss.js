export default (data) => {
    const parser = new DOMParser();
    const dom = parser.parseFromString(data, 'text/xml');

    const parseError = dom.querySelector('parsererror');
    if (parseError) {
        const error = new Error(parseError.textContent);
        error.isParsingError = true;
        error.data = data;
        throw error;
    }

    const channelTitleEl = dom.querySelector('channel > title');
    const channelTitle = channelTitleEl.textContent;
    const channelDescriptionEl = dom.querySelector('channel > description');
    const channelDescription = channelDescriptionEl.textContent;

    const itemEl = dom.querySelectorAll('item');
    const items = [...itemEl].map((el) => {        
        const titleEl = el.querySelector('title');
        const title = titleEl.textContent;
        const linkEl = el.querySelector('link');
        const link = linkEl.textContent;
        const descriptionEl = el.querySelector('description');
        const description = descriptionEl.textContent;
        return { title, link, description };
    });
    return { title: channelTitle, description: channelDescription, items };
};