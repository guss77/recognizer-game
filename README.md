# Recognizer Game

Base on the [Game of Geeks](http://www.gameofgeeks.tv/) TWiT.tv game show section,
this game uses a desktop web browser and a mobile device web browser to allow you
to challenge your friends to a game for "Recognizer".

If you are reading this document, then its likely because you want to run your
own instance, if so - look for the "Installation" section. Otherwise, you might
want to try playing on the hosted setup at [http://recognizer.geek.co.il](http://recognizer.geek.co.il).

## Instructions of use

1. Load the main display on a web browser that everyone can see - if you can project
   it on a large screen TV, all the better. The game was not tested on "Smart TV"
   built-in browser, but it should work - please let me know about your experience.
2. Use a smart phone with a bar code scanner, capture the QR code show on main
   display, and start the URL shown in a browser. The display should immediately 
   switch to "Please Wait...". If this is not the case then you have networking
   problem.
3. The phone display is now the manager for the game - choose a logo to play with
   or the dice icon to start a random recognizer pattern. The main display should
   now change to "Ready?" while the manager display will show the title of the
   selected pattern and a "play" button. 

The rest of the controls should be obvious.

## Installation

The game is a completely static web site (though I'm thinking of adding a dynamic
backend to manage the available patterns better - contact me if you want to help).

To insall, just copy all the files under `WebContent` to a web server and start
playing! The QR code generation is based on the web site being able to generate
self referring URLs based on the address in the browser window - this should work
fine for most cases. If you find an exotic setup that breaks the QR code generation,
please contact me.

## Adding new patterns to the game

### Image files

All the patterns are stored as 960x960 gray scale PNG formatted images under
`WebContent/images` (though there are also images for the interface of the game
stored there - these are stored as SVG images).

To generate new image files, I found ImageMagick's `convert` and the following
bash code useful:

~~~
function imgconvert() {
	local file="$1" threshold="${2:-90}"
	if [ "$threshold" -ge 0 ]; then
		threshold="-threshold ${threshold}%"
	else
		threshold=""
	fi
	convert $file -colorspace Gray ${threshold} -resize 960x960 -gravity center -extent 960x960 WebContent/images/${file%.*}.png
	gwenview WebContent/images/${file%.*}.png
}
~~~

I'm using `gwenview` to "proof read" the image file after the conversion, and if
its not good enough I can use a different threshold value (as the second parameter,
instead of the default value of 90%), disable black & white threshold-base conversion
(by using "-1" as the second parameter) or choose a different conversion method. If
you don't have `gwenview` installed, other viewers would probably work just as well :-)

#### Notes on choosing good pattern images

Try to avoid logos that are basically text, they make recognition really difficult
until you can read text, and then immediately very easy.

Its best to crop the image so that there is very little white space around the graphic,
otherwise there is wasted space on the display and it just makes recognition unnecessarily
difficult. Also remove any small markings that are irrelevant to the main graphic,
such as "TM" and "(R)".

I find it is useful to avoid color images (they tend to make the game very easy) and
to prefer completely black and white (i.e. no grays) images, as gray pixels tend to
confuse the viewers too much. The script above uses thresholding to remove gray pixels
(convert them to black or white depending on their brightness) and is tunable - play
with different threshold values until you get something you like. This algorithm
is also available from most graphics suites, so if you aren't running on Linux you
can use Gimp or other tools.

Some logos simply don't work work well in pure black & white, so you'd find some
images here to have some gray scales - at which point I try to minimize the dynamic range
of the image. Gimp's "Color Levels" tool is very useful for that. Other logos simply
do not work at all without color (for example, Nintendo 64) so I rather not add them
to the game at all.

### Pattern list

After you have a new image file stored under `WebContent/images`, you'd need to update
the `patterns.json` file with the new image. Simply add a new entry where you want (the
manager display will render the images in the order they are listed in the JSON file)
with the key being the text you want to display to the manager (try to keep it short -
three words is usually too much) and the value is the name of the image file, without
the `.png` extention or the path.
