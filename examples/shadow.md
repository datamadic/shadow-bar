Custom Elements + Shadow DOM (JavaScript Scoping Edition)
==

Shadow DOM provides a way to encapsulate DOM subtrees. Custom elements provide a way to extend the vocabulary of 
HTML adding more appropriate tag names and the ability to attach custom functionally to these new tags. 


Used together, you can now create modular DOM widgets with custom APIs. Very Cool. There are, however, a few things 
that might not be clear from the get-go regarding JavaScript scope and access. I hope this helps clears it up a bit for you. 

First, lets take a quick peek at the rules of encapsulation. 


## Encapsulation 


### Upper Boundary Encapsulation 
Governing the boundary between the shadow root and the shadow host. 

[From the spec](https://dvcs.w3.org/hg/webcomponents/raw-file/ccd579693e46/spec/shadow/index.html#upper-boundary-encapsulation):


* The ownerDocument property refers to the document of the shadow host 
* The nodes and named elements are not accessible using shadow host's document DOM tree accessors or with Window object named properties
* The nodes are not present in any of the document's NodeList, HTMLCollection, or DOMElementMap instances
* The nodes with a unique id and named elements are not addressable from any attributes of elements in shadow host's document
* The style sheets, represented by the nodes are not accessible using shadow host document's CSSOM extensions
* The nodes are accessible using shadow root's DOM tree accessor methods
* The nodes with a unique id and named elements are addressable from any attributes of elements in the same shadow DOM subtree
* The selectors must not cross the shadow boundary from the document tree into the shadow DOM subtree

#### Soooo WTF?

Basically, if you are a shadow root you have access to an exclusive DOM subtree (comprised of you and all of your descendants). 
All styles, classes, ids etc. that are contained in the subtree are in isolation from the rest of the outside DOM. Sooooo if you
have a `<div id="tiger">` in a shadow dom subtree and `<div id="tiger">` outside, the shadow root can query for the internal one 
and outside elements can query for the outer one. Styles can be segregated in a similar fashion. Easy.

**So what about the JavaScript scope?!?**  
There is only **one** document per window. This means that when you import a document via `<link rel="import" href="...">`
you are not adding another document to the window, you must 
[import the nodes](https://developer.mozilla.org/en-US/docs/Web/API/document.importNode) you want before using them. 

But the JavaScript... Right, so, at first glance it may seem that embedding a `<script>` in a `<template>`  
would scope that bit of JavaScript to the imported document and its DOM tree and thus its elements. For example, from the embedded script tag
you might (*mistakenly*) believe that you can query or apply styles to elements within the `<template>`. **This is not the case!**
The script tag, when the `<template>` is appended to a shadow root, gets added to the **global** JavaScript scope 
(remember it was brought in via `importNode`). This is true whether the template was imported or on the initial document. 

This means that it can't access the `<template>` elements even though it is inside the `<template>` itself!! 

So how can you access the contents programmaticly? When a call is made to `createShadowRoot()` a shadow root element is returned.
**This element can access the shadow DOM via JavaScript.**



## Example Please 

Lets say you have an html page that looks like this
```
<!doctype html>
<html>
	<head>
		<link title="scrollbar" rel="import" href="../components/scrollbar.html">
	</head>
	<body>
		<div class="demo-scroll-surface">
			<scroll-bar draggable="false"></scroll-bar>
		</div>
		<script>
			/* register the custom scroll-bar */
		</script>
	</body>
</html>
```
The link imports this page 
```
<template>
	<style>
		/* local styles */
	</style>
	<div class="scroll-bar" draggable="false">
		<scroll-bar-up draggable="false"></scroll-bar-up>
		<scroll-bar-thumb draggable="false"></scroll-bar-thumb>
		<scroll-bar-down draggable="false"></scroll-bar-down>
	</div>
</template>
```

####Lets create the `<scroll-bar>` custom element. 
Please note, the name **must** contain a hyphen (-). 
First we create an object that will act as a prototype for the new element. This prototype object extends HTMLElement's prototype. 
This will allow us to inherit tree accessor methods such as querySelector, getElementById, etc. In 
the [createdCallback](http://www.w3.org/TR/custom-elements/#registering-custom-elements) function
we do the heavy lifting. Here we grab a hold of the template via the import, import the node into the 
current document, and after converting the `<scroll-bar>` element to a shadow root, we display the newly imported 
template content node by attaching it to the shadow root. 

After configuring the new `<scroll-bar>` prototype, we make a call to `registerElement` passing in the tag name and prototype.

Kinda like this
```
<script>
	/* register the custom scroll-bar */
	var scrollBarProto = Object.create(HTMLElement.prototype, {
		createdCallback: {
			value: function(){
				// set up the template 
				var scrollbarImport = document.querySelector('link[title="scrollbar"]').import,
					scrollbarTemplate = scrollbarImport.querySelector('template'),
					scrollBarImportClone = document.importNode(scrollbarTemplate.content,true),
					//'this' in this case is the actual scroll-bar DOM element 
					scrollbarShadow = this.createShadowRoot();

				scrollbarShadow.appendChild(scrollBarImportClone);
				console.log(/*see pic below..*/)
			}
		}
	});
	document.registerElement('scroll-bar', {
		prototype: scrollBarProto
	});
</script>
```
####What have we got so far?
A screen shot of a console log form **inside** the createdCallback function sheds a little light. 

![you should be seeing a console screen shot... ](inCreated.png "From createdCallback")

A few things to notice: 

* `document.querySelector('link[title="scrollbar"]').import` is a document 
* From the import, you can query for the `<template>` 
* The `<template>` contains a `#document-fragment` this is shadow DOM, only reachable from within the shadow dom tree
* Querying for any dom element within the `#document-fragment` such as the `<scroll-bar-thumb>` element from anywhere else besides the shadow root (or within the shadow tree) will return null
* The shadow root can query itself for child elements






