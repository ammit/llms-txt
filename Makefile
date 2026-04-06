.PHONY: build dev lint test clean install publish

install:
	npm install

build:
	npm run build

dev:
	npm run dev

lint:
	npm run lint

test:
	npm run test

clean:
	rm -rf dist node_modules

run:
	@node dist/index.js $(ARGS)

# Example: make generate URL=https://example.com
generate:
	@node dist/index.js $(URL)
