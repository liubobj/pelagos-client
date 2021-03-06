define([
  "dojo/_base/declare",
  "./Widgets/TemplatedDialog",
  "dijit/layout/BorderContainer",
  "dijit/layout/ContentPane",
  "dijit/form/Button",
  "shims/async/main",
  "shims/jQuery/main",
  "app/Visualization/KeyBindings",
  "app/LoadingInfo",
  "app/Visualization/UI/Widgets/ColorDropdown"
], function(
  declare,
  Dialog,
  BorderContainer,
  ContentPane,
  Button,
  async,
  $,
  KeyBindings,
  LoadingInfo,
  ColorDropdown
){
  return declare("SimpleAnimationEdtor", [Dialog], {
    style: "width: 50%;",
    title: "Animation editor",
    "class": 'simple-animation-editor-dialog',
    contentTemplate: '' +
      '<div data-dojo-type="dijit/layout/BorderContainer" data-dojo-props="liveSplitters: true" style="min-height: 300px; height: 100%; width: 100%; padding: 0; margin: 0;">' +
      '  <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:\'top\'" class="actions" style="border: none; padding: 0; margin: 0;" data-dojo-attach-point="container">' +
      '    <div data-dojo-type="dijit/form/Button" data-dojo-attach-event="click:addCartoDBAnimation">Add CartoDB</div>' +
      '    <div data-dojo-type="dijit/form/Button" data-dojo-attach-event="click:addFromLibrary">From library</div>' +
      '  </div>' +
      '  <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:\'center\'" class="list" style="border: none; padding: 0; margin: 0;" data-dojo-attach-point="list">' +
      '  </div>' +
      '  <div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region:\'right\'" style="border: none; padding: 10px; margin: 0; width: 50%" data-dojo-attach-point="editorPane">' +
      '  </div>' +
      '</div>',

    actionBarTemplate: '' +
      '<div class="dijitDialogPaneActionBar" data-dojo-attach-point="actionBarNode">' +
      '  <button data-dojo-type="dijit/form/Button" type="submit" data-dojo-attach-event="click:hide">Close</button>' +
      '</div>',

    visualization: null,
    addFromLibrary: function () {
      var self = this;
      self.visualization.ui.library.displayAnimationLibraryDialog();
    },
    startup: function () {
      var self = this;
      self.inherited(arguments);

      KeyBindings.register(
        ['Ctrl', 'Alt', 'G'], null, 'General',
        'Simple animation editor', self.display.bind(self)
      );

      self.updateListHandler = self.updateList.bind(self)
      self.visualization.animations.events.on({
        'add': self.updateListHandler,
        'remove': self.updateListHandler
      });
      self.updateList();
    },

    updateList: function () {
      var self = this;
      $(self.list.containerNode).html('');

      visualization.animations.animations.map(function (animation) {
        /* FIXME: Horrible hack to conform to UX */
        if (animation.name != 'CartoDBAnimation') return;
        var row = $("<div></div>");
        row.text(animation.title);
        var description = animation.name;
        try {
          if (animation.args.source.args.url) {
            description += ': ' + animation.args.source.args.url;
          }
        } catch (e) {};

        row.attr({title: description});
        row.data('animation', animation);
        row.click(self.editAnimation.bind(self));

        animation.events.un({updated: self.updateListHandler});
        animation.events.on({updated: self.updateListHandler});

        $(self.list.containerNode).append(row);
      });
    },

    setEditor: function (editor) {
      var self = this;

      if (self.editor) {
        self.editorPane.removeChild(self.editor);
      }
      self.editor = editor;
      if (self.editor) {
        self.editorPane.addChild(self.editor);
      }
    },

    editAnimation: function (event) {
      var self = this;
      var animation = $(event.target).data('animation');

      var editor = new ContentPane({'class': 'editor', style: 'border: none; padding: 0; margin: 0; width: 100%; height: 100%;', content: '' +
        '<table>' +
        '  <tr><th>Title:</th><td><input class="title" type="text"></td></tr>' +
        '  <tr><th>Type:</th><td class="type"></td></tr>' +
        '  <tr><th>Url:</th><td><input class="url" type="text" disabled="disabled"></td></tr>' +
        '  <tr><th>Color:</th><td class="color"></td></tr>' +
        '</table>' +
        '<button class="save">Save</button> ' +
        '<button class="delete">Delete</button>'
      });

      var colorDropdown = new ColorDropdown();
      colorDropdown.placeAt($(editor.containerNode).find('.color')[0]);
      colorDropdown.startup();

      $(editor.containerNode).find('.title').val(animation.title);
      $(editor.containerNode).find('.type').text(animation.name);
      $(editor.containerNode).find('.url').val(animation.args.source.args.url);
      colorDropdown.set("value", animation.color);

      $(editor.containerNode).find('.save').click(function () {
        animation.title = $(editor.containerNode).find('.title').val();
        animation.color = colorDropdown.get("value");
        animation.events.triggerEvent("updated");
        self.setEditor();
      });
      $(editor.containerNode).find('.delete').click(function () {
        self.visualization.animations.removeAnimation(animation);
        self.setEditor();
      });

      self.setEditor(editor);
    },

    addCartoDBAnimation: function (event) {
      var self = this;

      var editor = new ContentPane({'class': 'editor', style: 'border: none; padding: 0; margin: 0; width: 100%; height: 100%;', content: '' +
        '<table>' +
        '  <tr><th>Title:</th><td><input class="title" type="text"></td></tr>' +
        '  <tr><th>Type:</th><td class="type">CartoDBAnimation</td></tr>' +
        '  <tr><th>Url:</th><td><input class="url" type="text"></td></tr>' +
        '  <tr><th>Color:</th><td class="color"></td></tr>' +
        '</table>' +
        '<button class="add">Add animation</button'
      });

      var colorDropdown = new ColorDropdown({value: "#0000ff"});
      colorDropdown.placeAt($(editor.containerNode).find('.color')[0]);
      colorDropdown.startup();

      $(editor.containerNode).find('.add').click(function () {
        var title = $(editor.containerNode).find('.title').val();
        var url = $(editor.containerNode).find('.url').val();
        var color = colorDropdown.get("value");

        if (url.length == 0) {
          alert("You must provide a layer URL");
          return;
        }
        if (title.length == 0) {
          title = 'CartoDBAnimation: ' + url;
        }

        self.visualization.animations.addAnimation({
          type:'CartoDBAnimation',
          args: {
            title: title,
            color: color,
            source: {type:'EmptyFormat', args: {url:url}}
          }
        }, function (err, animation) {});

        self.setEditor();
      });

      self.setEditor(editor);
    },


    display: function () {
      var self = this;
      self.show();
    }
  });
});
