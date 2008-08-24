/* 

Script: Core.js
	MochaUI - A Web Applications User Interface Framework.
	
Copyright:
	Copyright (c) 2007-2008 Greg Houston, <http://greghoustondesign.com/>.
	
License:
	MIT-style license.

Contributors:
	- Scott F. Frederick
	- Joel Lindau
	
Note:
	This documentation is taken directly from the javascript source files. It is built using Natural Docs.
	
*/

var MochaUI = new Hash({
	options: new Hash({
		useEffects: false,    // Toggles the majority of window fade and move effects.
		useLoadingIcon: true  // Toggles whether or not the ajax spinners are displayed in window footers.

	}),
	Panels: {	  
		instances:      new Hash()	
	},		
	Windows: {	  
		instances:      new Hash(),
		indexLevel:     100,          // Used for z-Index
		windowIDCount:  0,	          // Used for windows without an ID defined by the user
		windowsVisible: true          // Ctrl-Alt-Q to toggle window visibility		
	},	
	ieSupport:  'excanvas',   // Makes it easier to switch between Excanvas and Moocanvas for testing
	focusingWindow: 'false',
	/*
	
	Function: updateContent
		Replace the content of a window.
		
	Arguments:
		windowEl, content, url
		
	*/	
	updateContent: function(updateOptions){

		var options = {
			'element':      null,
			'childElement': null,
			'title':        null,			
			'content':      null,
			'url':          null,
			'loadMethod':   null,
			'padding':      null
		};
		$extend(options, updateOptions);
		
		if (!options.element) return;
		var element = options.element;
        
		if (MochaUI.Windows.instances.get(element.id)) {
			var recipient = 'window';
			var currentInstance = MochaUI.Windows.instances.get(element.id);
			var canvasIconEl = currentInstance.canvasIconEl;
			if (options.title) {
				currentInstance.titleEl.set('html', options.title);
			}
		}
		else {
			var recipient = 'panel';
			var currentInstance = MochaUI.Panels.instances.get(element.id);
			if (options.title) {
				currentInstance.titleEl.set('html', options.title);
			}			
		}
        
		var contentEl = currentInstance.contentEl
		if (options.childElement != null) {
			var contentContainer = options.childElement;
		}
		else {
			var contentContainer = currentInstance.contentEl;
		}
		
		// Set scrollbars, always use 'hidden' for iframe windows
		currentInstance.contentWrapperEl.setStyles({
			'overflow': currentInstance.options.scrollbars && (options.loadMethod != 'iframe') ? 'auto' : 'hidden'
		});		
		
		if (options.padding != null) {
			currentInstance.contentEl.setStyles({	
				'padding-top': options.padding.top,
				'padding-bottom': options.padding.bottom,
				'padding-left': options.padding.left,
				'padding-right': options.padding.right
			});
		}		
        
		// Remove old content.
		if (contentContainer == contentEl) {
			currentInstance.contentEl.empty();
		}		
				
		var loadMethod = options.loadMethod ? options.loadMethod : currentInstance.options.loadMethod;

		// Load new content.
		switch(loadMethod) {
			case 'xhr':
				new Request.HTML({
					url: options.url,
					update: contentContainer,
					evalScripts: currentInstance.options.evalScripts,
					evalResponse: currentInstance.options.evalResponse,
					onRequest: function(){
						if (recipient == 'window' && contentContainer == contentEl){
							currentInstance.showLoadingIcon(canvasIconEl);
						}
					}.bind(this),
					onFailure: function(){
						if (contentContainer == contentEl){
							contentContainer.set('html','<p><strong>Error Loading XMLHttpRequest</strong></p>');
							if (recipient == 'window') {
								currentInstance.hideLoadingIcon(canvasIconEl);
							}
						}
					}.bind(this),
					onSuccess: function() {
						if (contentContainer == contentEl){
							if (recipient == 'window') {
								currentInstance.hideLoadingIcon(canvasIconEl);
							}	
							currentInstance.fireEvent('onContentLoaded', element);
						}
					}.bind(this)
				}).get();
				break;
			case 'iframe': // May be able to streamline this if the iframe already exists.
				if ( currentInstance.options.contentURL == '' || contentContainer != contentEl) {
					break;
				}
				currentInstance.iframeEl = new Element('iframe', {
					'id': currentInstance.options.id + '_iframe',
					'name':  currentInstance.options.id + '_iframe',
					'class': 'mochaIframe',
					'src': options.url,
					'marginwidth':  0,
					'marginheight': 0,
					'frameBorder':  0,
					'scrolling':    'auto',
					'styles': {
						'height': currentInstance.contentWrapperEl.offsetHeight	
					}
				}).injectInside(contentEl);
				
				// Add onload event to iframe so we can stop the loading icon and run onContentLoaded()
				currentInstance.iframeEl.addEvent('load', function(e) {
					if (recipient == 'window') {
						currentInstance.hideLoadingIcon.delay(150, currentInstance, canvasIconEl);
					}
					currentInstance.fireEvent('onContentLoaded', element);
				}.bind(this));
				if (recipient == 'window') {
					currentInstance.showLoadingIcon(canvasIconEl);
				}
				break;
			case 'html':
			default:
				// Need to test injecting elements as content.
				var elementTypes = new Array('element', 'textnode', 'whitespace', 'collection');
				if (elementTypes.contains($type(options.content))) {
					options.content.inject(contentContainer);
				} else {
					contentContainer.set('html', options.content);
				}				
				currentInstance.fireEvent('onContentLoaded', element);
				break;
		}

	},
	collapseToggle: function(windowEl){
		var instances = MochaUI.Windows.instances;
		var currentInstance = instances.get(windowEl.id);
		var handles = currentInstance.windowEl.getElements('.handle');		
		if (currentInstance.isCollapsed == false) {
			currentInstance.isCollapsed = true;
			handles.setStyle('display', 'none');
			if ( currentInstance.iframeEl ) {
				currentInstance.iframeEl.setStyle('visibility', 'hidden');
			}			
			currentInstance.contentBorderEl.setStyles({
				visibility: 'hidden',
				position: 'absolute',
				top: -10000,
				left: -10000
			});
			if(currentInstance.toolbarWrapperEl){
				currentInstance.toolbarWrapperEl.setStyles({
					visibility: 'hidden',
					position: 'absolute',
					top: -10000,
					left: -10000
				});
			}
			currentInstance.drawWindowCollapsed(windowEl);
		}
		else {			
			currentInstance.isCollapsed = false;
			currentInstance.drawWindow(windowEl);					
			currentInstance.contentBorderEl.setStyles({
				visibility: 'visible',
				position: null,
				top: null,
				left: null
			});
			if(currentInstance.toolbarWrapperEl){
				currentInstance.toolbarWrapperEl.setStyles({
					visibility: 'visible',
					position: null,
					top: null,
					left: null
				});				
			}
			if ( currentInstance.iframeEl ) {
				currentInstance.iframeEl.setStyle('visibility', 'visible');
			}
			handles.setStyle('display', 'block');			
		}		
	},
	/*
	
	Function: closeWindow
		Closes a window.

	Syntax:
	(start code)
		MochaUI.closeWindow();
	(end)

	Arguments: 
		windowEl - the ID of the window to be closed
		
	Returns:
		true - the window was closed
		false - the window was not closed
		
	*/
	closeWindow: function(windowEl){
		// Does window exist and is not already in process of closing ?		

		var instances = MochaUI.Windows.instances;
		var currentInstance = instances.get(windowEl.id);
		if (windowEl != $(windowEl) || currentInstance.isClosing) return;
			
		currentInstance.isClosing = true;
		currentInstance.fireEvent('onClose', windowEl);
		if (currentInstance.check) currentInstance.check.destroy();			

		if (currentInstance.options.type == 'modal' && Browser.Engine.trident4){
				$('modalFix').setStyle('display', 'none');
		}

		if (MochaUI.options.useEffects == false){
			if (currentInstance.options.type == 'modal'){
				$('modalOverlay').setStyle('opacity', 0);
			}		
			MochaUI.closingJobs(windowEl);
			return true;	
		}
		else {
			// Redraws IE windows without shadows since IE messes up canvas alpha when you change element opacity
			if (Browser.Engine.trident) currentInstance.drawWindow(windowEl, false);
			if (currentInstance.options.type == 'modal'){
				MochaUI.Modal.modalOverlayCloseMorph.start({
					'opacity': 0
				});								
			}
			var closeMorph = new Fx.Morph(windowEl, {
				duration: 180,
				onComplete: function(){					
					MochaUI.closingJobs(windowEl);
					return true;					
				}.bind(this)
			});
			closeMorph.start({
				'opacity': .4
			});
		}		
	
	},
	closingJobs: function(windowEl){

		windowEl.destroy();
		var instances = MochaUI.Windows.instances;
		var currentInstance = instances.get(windowEl.id);
		currentInstance.fireEvent('onCloseComplete');
		
		if (this.options.type != 'modal' && this.options.type != 'notification') {
			var newFocus = this.getWindowWithHighestZindex();
			this.focusWindow(newFocus);
		}
					
		instances.erase(currentInstance.options.id);
		if (this.loadingWorkspace == true) {
			this.windowUnload();
		}
		
		if (MochaUI.Dock && $(MochaUI.options.dock) && currentInstance.options.type == 'window') {
			currentButton = $(currentInstance.options.id + '_dockTab');
			MochaUI.Dock.dockSortables.removeItems(currentButton).destroy();
			// Need to resize everything in case the dock becomes smaller when a tab is removed
			MochaUI.Desktop.setDesktopSize();
		}
	},	
	/*
	
	Function: closeAll	
		Close all open windows.

	*/
	closeAll: function() {		
		$$('div.mocha').each(function(windowEl){
			this.closeWindow(windowEl);			
		}.bind(this));
	},
	/*
	
	Function: toggleWindowVisibility
		Toggle window visibility with Ctrl-Alt-Q.
	
	*/	
	toggleWindowVisibility: function(){		
		MochaUI.Windows.instances.each(function(instance){
			if (instance.options.type == 'modal' || instance.isMinimized == true) return;									
			var id = $(instance.options.id);									
			if (id.getStyle('visibility') == 'visible'){
				if (instance.iframe){
					instance.iframeEl.setStyle('visibility', 'hidden');
				}
				if (instance.toolbarEl){
					instance.toolbarWrapperEl.setStyle('visibility', 'hidden');		
				}
				instance.contentBorderEl.setStyle('visibility', 'hidden');				
				id.setStyle('visibility', 'hidden');				
				MochaUI.Windows.windowsVisible = false;
			}
			else {
				id.setStyle('visibility', 'visible');
				instance.contentBorderEl.setStyle('visibility', 'visible');
				if (instance.iframe){
					instance.iframeEl.setStyle('visibility', 'visible');
				}
				if (instance.toolbarEl){
					instance.toolbarWrapperEl.setStyle('visibility', 'visible');		
				}				
				MochaUI.Windows.windowsVisible = true;
			}
		}.bind(this));

	},	
	focusWindow: function(windowEl, fireEvent){

		// This is used with blurAll
		MochaUI.focusingWindow = 'true';
		var windowClicked = function(){
			MochaUI.focusingWindow = 'false';
		}		
		windowClicked.delay(170, this);

		// Only focus when needed				
		if (windowEl != $(windowEl) || windowEl.hasClass('isFocused')) return;		

		var instances =  MochaUI.Windows.instances;		
		var currentInstance = instances.get(windowEl.id);			

		MochaUI.Windows.indexLevel += 2;
		windowEl.setStyle('zIndex', MochaUI.Windows.indexLevel);

		// Used when dragging and resizing windows
		$('windowUnderlay').setStyle('zIndex', MochaUI.Windows.indexLevel - 1).inject($(windowEl),'after');		

		// Fire onBlur for the window that lost focus.
		instances.each(function(instance){
			if (instance.windowEl.hasClass('isFocused')){
				instance.fireEvent('onBlur', instance.windowEl);
			}
			instance.windowEl.removeClass('isFocused');			
		});
		
		if (MochaUI.Dock && $(MochaUI.options.dock) && currentInstance.options.type == 'window') {
			MochaUI.Dock.makeActiveTab();
		}
		currentInstance.windowEl.addClass('isFocused');
		
		if (fireEvent != false){
			currentInstance.fireEvent('onFocus', windowEl);
		}		
	
	},
	getWindowWithHighestZindex: function(){
		this.highestZindex = 0;
		$$('div.mocha').each(function(element){
			this.zIndex = element.getStyle('zIndex');
			if (this.zIndex >= this.highestZindex) {
				this.highestZindex = this.zIndex;
			}	
		}.bind(this));
		$$('div.mocha').each(function(element){			
			if (element.getStyle('zIndex') == this.highestZindex) {
				this.windowWithHighestZindex = element;
			}	
		}.bind(this));
		return this.windowWithHighestZindex;
	},
	blurAll: function(){
		//alert(MochaUI.focusingWindow);
		if (MochaUI.focusingWindow == 'false') {
			$$('.mocha').each(function(windowEl){
				var instances =  MochaUI.Windows.instances;
				var currentInstance = instances.get(windowEl.id);
				windowEl.removeClass('isFocused');				
			});
			$$('div.dockTab').removeClass('activeDockTab');
		}
	},	
	roundedRect: function(ctx, x, y, width, height, radius, rgb, a){
		ctx.fillStyle = 'rgba(' + rgb.join(',') + ',' + a + ')';
		ctx.beginPath();
		ctx.moveTo(x, y + radius);
		ctx.lineTo(x, y + height - radius);
		ctx.quadraticCurveTo(x, y + height, x + radius, y + height);
		ctx.lineTo(x + width - radius, y + height);
		ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
		ctx.lineTo(x + width, y + radius);
		ctx.quadraticCurveTo(x + width, y, x + width - radius, y);
		ctx.lineTo(x + radius, y);
		ctx.quadraticCurveTo(x, y, x, y + radius);
		ctx.fill(); 
	},	
	triangle: function(ctx, x, y, width, height, rgb, a){
		ctx.beginPath();
		ctx.moveTo(x + width, y);
		ctx.lineTo(x, y + height);
		ctx.lineTo(x + width, y + height);
		ctx.closePath();
		ctx.fillStyle = 'rgba(' + rgb.join(',') + ',' + a + ')';
		ctx.fill();
	},	
	circle: function(ctx, x, y, diameter, rgb, a){
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.arc(x, y, diameter, 0, Math.PI*2, true);
		ctx.fillStyle = 'rgba(' + rgb.join(',') + ',' + a + ')';
		ctx.fill();
	},
	/*
	
	Function: centerWindow
		Center a window in it's container. If windowEl is undefined it will center the window that has focus.
		
	*/	
	centerWindow: function(windowEl){
		
		if(!windowEl){
			MochaUI.Windows.instances.each(function(instance){
				if (instance.windowEl.hasClass('isFocused')){
					windowEl = instance.windowEl;
				}				
			});		
		}
		
		var currentInstance = MochaUI.Windows.instances.get(windowEl.id);
		var options = currentInstance.options;
		var dimensions = options.container.getCoordinates();
		var windowPosTop = (dimensions.height * .5) - ((options.height + currentInstance.headerFooterShadow) * .5);
		var windowPosLeft =	(dimensions.width * .5) - (options.width * .5);
		
		if (MochaUI.options.useEffects == true){
			currentInstance.morph.start({
				'top': windowPosTop,
				'left': windowPosLeft
			});
		}
		else {
			windowEl.setStyles({
				'top': windowPosTop,
				'left': windowPosLeft
			});
		}
	},
	/*
	
	Function: dynamicResize
		Use with a timer to resize a window as the window's content size changes, such as with an accordian.
		
	*/		
	dynamicResize: function(windowEl){
		var currentInstance = MochaUI.Windows.instances.get(windowEl.id);
		var contentWrapperEl = currentInstance.contentWrapperEl;
		var contentEl = currentInstance.contentEl;
		
		contentWrapperEl.setStyle('height', contentEl.offsetHeight);
		contentWrapperEl.setStyle('width', contentEl.offsetWidth);			
		currentInstance.drawWindow(windowEl);
	},	
	/*
	
	Function: garbageCleanUp
		Empties all windows of their children, and removes and garbages the windows. It is does not trigger onClose() or onCloseComplete(). This is useful to clear memory before the pageUnload.
		
	Syntax:
	(start code)
		MochaUI.garbageCleanUp();
	(end)
	
	*/	
	garbageCleanUp: function(){
		$$('div.mocha').each(function(el){
			el.destroy();
		}.bind(this));		
	},
	/*
	
	The underlay is inserted directly under windows when they are being dragged or resized
	so that the cursor is not captured by iframes or other plugins (such as Flash)
	underneath the window.
	
	*/
	underlayInitialize: function(){
		var windowUnderlay = new Element('div', {
			'id': 'windowUnderlay',
			'styles': {
				'height': parent.getCoordinates().height,
				'opacity': .01,
				'visibility': 'hidden'
			}
		}).inject(document.body);
	},
	setUnderlaySize: function(){
		$('windowUnderlay').setStyle('height', parent.getCoordinates().height);
	}		
});

// Toggle window visibility with Ctrl-Alt-Q
document.addEvent('keydown', function(event){							 
	if (event.key == 'q' && event.control && event.alt) {
		MochaUI.toggleWindowVisibility();
	}
});

// Blur all windows if user clicks anywhere else on the page
document.addEvent('click', function(event){
	MochaUI.blurAll.delay(50);	
});

document.addEvent('domready', function(){
	MochaUI.underlayInitialize();
});	
	
window.addEvent('resize', function(){
		MochaUI.setUnderlaySize();
});


