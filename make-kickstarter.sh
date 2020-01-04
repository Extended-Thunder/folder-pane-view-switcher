#!/bin/bash -e

cd send-later
make &> /dev/null
cd ..
ld=chrome/locale
for slocale in $(cd send-later/build/$ld && ls); do
    tlocale=$slocale
    if [ ! -d $ld/$tlocale -a -d $ld/${tlocale%-*} ]; then
        tlocale=${tlocale%-*}
    fi
    mkdir -p $ld/$tlocale
    for file in $(cd $ld/en-US && ls | grep -v kickstarter); do
        test -f $ld/$tlocale/$file || cp $ld/en-US/$file $ld/$tlocale
    done
    if [ -d _locales/$tlocale ]; then
        ld2=$tlocale
    else
        ld2=en-US
    fi
    fromname1="Send Later"
    fromname2=$(sed -n -e 's/^MessageTag=//p' \
                    send-later/build/$ld/$slocale/prompt.properties)
    if [ ! "$fromname2" ]; then
        echo Could not find Send Later name for $slocale 1>&2
        exit 1
    fi
    toname=$(jq -r .appName.message _locales/$ld2/messages.json)
    sed -e "s/$fromname1/$toname/" -e "s/$fromname2/$toname/" \
        send-later/build/$ld/$slocale/kickstarter.dtd > \
        $ld/$tlocale/kickstarter.dtd
    if cmp -s {send-later/build/$ld/$slocale,$td/$tlocale}/kickstarter.dtd
    then
        echo Name substitution in kickstarter.dtd for $slocale failed 1>&2
        exit 1
    fi
    if ! grep -q -s -w $tlocale chrome.manifest; then
        echo locale FolderPaneSwitcher $tlocale chrome/locale/$tlocale/ >> \
             chrome.manifest
    fi
    cp send-later/build/chrome/resource/kickstarter.jsm chrome/content/.
    sed -e 's/sendlater3/FolderPaneSwitcher/' \
        send-later/build/chrome/content/kickstarter.xul > \
        chrome/content/kickstarter.xul
done

    
