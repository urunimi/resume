.PHONY: help install translate pdf build clean theme

help:
	@echo "Targets:"
	@echo "  make install          - npm install"
	@echo "  make translate        - Translate resume.ko.json → resume.en.json (overwrite; use git diff to review)"
	@echo "  make pdf              - Build PDFs (ko, en)"
	@echo "  make build            - Translate + build PDFs"
	@echo "  make clean            - Remove output/ and resume.en.json"
	@echo "  make theme THEME=elegant - Swap to jsonresume-theme-<THEME>"

install:
	npm install

translate:
	npm run translate -- --force

pdf:
	npm run build:pdf

build: translate pdf

clean:
	rm -rf output resume.en.json

theme:
ifndef THEME
	$(error THEME is required, e.g. `make theme THEME=elegant`)
endif
	@current=$$(npm pkg get config.theme | tr -d '"'); \
		if [ -n "$$current" ] && [ "$$current" != "jsonresume-theme-$(THEME)" ]; then \
			npm uninstall $$current; \
		fi
	npm install jsonresume-theme-$(THEME)
	npm pkg set config.theme=jsonresume-theme-$(THEME)
