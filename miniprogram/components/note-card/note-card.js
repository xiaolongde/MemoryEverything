// components/note-card/note-card.js
const { formatTime } = require('../../utils/format');

Component({
  properties: {
    note: {
      type: Object,
      value: {}
    }
  },

  data: {
    timeStr: ''
  },

  lifetimes: {
    attached() {
      this.formatNoteTime();
    }
  },

  observers: {
    'note.createTime': function() {
      this.formatNoteTime();
    }
  },

  methods: {
    formatNoteTime() {
      const { note } = this.data;
      if (note && note.createTime) {
        this.setData({
          timeStr: formatTime(note.createTime)
        });
      }
    },

    // 预览图片
    previewImage(e) {
      const index = e.currentTarget.dataset.index;
      const { note } = this.data;
      wx.previewImage({
        current: note.images[index],
        urls: note.images
      });
    }
  }
});
