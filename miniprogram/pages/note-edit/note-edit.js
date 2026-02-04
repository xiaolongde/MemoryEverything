// pages/note-edit/note-edit.js
const noteService = require('../../services/note');

Page({
  data: {
    id: null,
    content: '',
    images: [],
    tags: [],
    tagInput: '',
    mood: '',
    moods: [
      { value: 'happy', emoji: '😊', label: '开心' },
      { value: 'thinking', emoji: '🤔', label: '思考' },
      { value: 'sad', emoji: '😢', label: '难过' },
      { value: 'excited', emoji: '🎉', label: '兴奋' },
      { value: 'calm', emoji: '😌', label: '平静' }
    ],
    isEdit: false,
    saving: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id, isEdit: true });
      this.loadNote(options.id);
      wx.setNavigationBarTitle({ title: '编辑感悟' });
    } else {
      wx.setNavigationBarTitle({ title: '新建感悟' });
    }
  },

  // 加载感悟详情
  async loadNote(id) {
    try {
      const res = await noteService.getNoteById(id);
      if (res.data) {
        const note = res.data;
        this.setData({
          content: note.content || '',
          images: note.images || [],
          tags: note.tags || [],
          mood: note.mood || ''
        });
      }
    } catch (err) {
      console.error('加载感悟失败：', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 内容输入
  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  // 选择心情
  onMoodSelect(e) {
    const mood = e.currentTarget.dataset.mood;
    this.setData({
      mood: this.data.mood === mood ? '' : mood
    });
  },

  // 标签输入
  onTagInput(e) {
    this.setData({ tagInput: e.detail.value });
  },

  // 添加标签
  addTag() {
    const { tagInput, tags } = this.data;
    const tag = tagInput.trim();

    if (!tag) return;
    if (tags.includes(tag)) {
      wx.showToast({ title: '标签已存在', icon: 'none' });
      return;
    }
    if (tags.length >= 5) {
      wx.showToast({ title: '最多添加5个标签', icon: 'none' });
      return;
    }

    this.setData({
      tags: [...tags, tag],
      tagInput: ''
    });
  },

  // 删除标签
  removeTag(e) {
    const index = e.currentTarget.dataset.index;
    const tags = [...this.data.tags];
    tags.splice(index, 1);
    this.setData({ tags });
  },

  // 选择图片
  async chooseImage() {
    const { images } = this.data;
    if (images.length >= 9) {
      wx.showToast({ title: '最多上传9张图片', icon: 'none' });
      return;
    }

    try {
      const res = await wx.chooseMedia({
        count: 9 - images.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      });

      const newImages = res.tempFiles.map(file => file.tempFilePath);
      this.setData({
        images: [...images, ...newImages]
      });
    } catch (err) {
      console.log('取消选择图片');
    }
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images
    });
  },

  // 删除图片
  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  // 上传图片到云存储
  async uploadImages(localImages) {
    const uploadedImages = [];

    for (const path of localImages) {
      // 如果已经是云存储路径，跳过
      if (path.startsWith('cloud://')) {
        uploadedImages.push(path);
        continue;
      }

      try {
        const cloudPath = `notes/${Date.now()}_${Math.random().toString(36).substr(2)}.jpg`;
        const res = await wx.cloud.uploadFile({
          cloudPath,
          filePath: path
        });
        uploadedImages.push(res.fileID);
      } catch (err) {
        console.error('上传图片失败：', err);
      }
    }

    return uploadedImages;
  },

  // 保存感悟
  async save() {
    const { id, content, images, tags, mood, isEdit, saving } = this.data;

    if (saving) return;

    if (!content.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      // 上传图片
      const uploadedImages = await this.uploadImages(images);

      const noteData = {
        content: content.trim(),
        images: uploadedImages,
        tags,
        mood
      };

      if (isEdit) {
        await noteService.updateNote(id, noteData);
      } else {
        await noteService.addNote(noteData);
      }

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });

      // 标记需要刷新列表
      wx.setStorageSync('needRefreshNotes', true);

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.hideLoading();
      console.error('保存失败：', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
