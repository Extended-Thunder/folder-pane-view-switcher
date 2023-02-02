all: FolderPaneSwitcher.xpi

CMD=find . \( \( -name RCS -o -name .svn -o -name .git \) -prune \) -o \
	\! -name .gitignore \
	\! -name '*~' \
	\! -name '.\#*' \
	\! -name '*,v' \
	\! -name Makefile \
	\! -name '*.xpi' \
	\! -name '\#*' \
	\! -name '*.pl' \
	\! -name '\.*.js' \
	\! -name 'README.md' \
	\! -iname '.ds_store' \
	\! \( -path '*/.git/*' -or -path '*/.vscode/*' \) \
	-type f -print
FILES=$(shell $(CMD))

FolderPaneSwitcher.xpi: $(FILES)
	rm -f $@.tmp
	zip -r $@.tmp $(FILES)
	mv $@.tmp $@

clean: ; -rm -f FolderPaneSwitcher.xpi
