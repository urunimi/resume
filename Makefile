.PHONY: help install translate pdf build clean release

help:
	@echo "Targets:"
	@echo "  make install          - npm install"
	@echo "  make translate        - Translate resume.ko.json → resume.en.json (overwrite; use git diff to review)"
	@echo "  make pdf              - Build PDFs (ko, en)"
	@echo "  make build            - Translate + build PDFs"
	@echo "  make clean            - Remove output/ and resume.en.json"
	@echo "  make release VERSION=v0.1.0 - Tag and push to trigger GitHub Release"

install:
	npm install

translate:
	npm run translate -- --force

pdf:
	npm run build:pdf

build: translate pdf

clean:
	rm -rf output resume.en.json

release:
ifndef VERSION
	$(error VERSION is required, e.g. `make release VERSION=v0.1.0`)
endif
	git tag $(VERSION)
	git push origin $(VERSION)
