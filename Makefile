develop:
	npx webpack serve

install:
	npm ci

build:
	npm run build

lint:
	npx eslint .

lint-fix:
	npx eslint . --fix