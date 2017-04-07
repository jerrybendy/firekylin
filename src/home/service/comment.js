'use strict';

import request from 'request';

request.defaults({
  strictSSL: false,
  rejectUnauthorized: false
});

const _ = {
  get: think.promisify(request, request),
  post: think.promisify(request.post, request) 
};

export default class extends think.service.base {
  /**
   * init
   * @return {}         []
   */
  init(...args){
    super.init(...args);
  }
  /**
   * sync post comments
   * @return {[type]} [description]
   */
  async sync(){
    let optionsModel = this.model('options');
    let options = await optionsModel.getOptions();
    let comment = options.comment;
    comment.site_url = options.site_url;

    if(comment.name){
      if(comment.type === 'disqus'){
        return this.syncFromDisqus(comment);
      }else if(comment.type === 'duoshuo'){
        return this.syncFromDuoshuo(comment);
      }else if(comment.type === 'changyan'){
        return this.syncFromChangyan(comment);
      }else if(comment.type === 'netease'){
        return this.syncFromNetease(comment);
      }
    }
  }

  /**
   * get post data
   * @return {[type]} [description]
   */
  async getPostData(){
    let postModel = this.model('post');
    let allPost = await postModel.setRelation(false).order('create_time DESC').field('id,pathname,comment_num,type').select();
    let keys = {};
    allPost.map(item => {
      let key = think.md5(item.pathname);
      keys[key] = item;
      return key;
    });
    return keys;
  }
  /**
   * sync from disqus
   * @return {[type]} [description]
   */
  async syncFromDisqus(comment){

    let postData = await this.getPostData();
    if(think.isEmpty(postData)){
      return;
    }
    let threads = Object.keys(postData); //.join('&l=')
    let index = 0;
    while(true){
      let ths = threads.slice(index, index + 10);
      index += 10;
      if(!ths.length){
        return;
      }
      let url = `https://${comment.name}.disqus.com/count-data.js?1=${ths.join('&1=')}`;
      //think.log(`sync comments ${url}`);
      let response = await _.get(url).catch(() => {});
      if(!response){
        continue;
      }
      let data = response.body.match(/DISQUSWIDGETS.displayCount\(([^\(\)]+)\);/);
      if(!data){
        continue;
      }

      data = JSON.parse(data[1]).counts;
      let promises = data.map(item => {
        if(item.comments === postData[item.id].comment_num){
          return;
        }
        let id = postData[item.id].id;
        return this.model('post').where({id: id}).update({comment_num: item.comments});
      });
      await Promise.all(promises);
      if(promises.length){
        await this.clearPostCache();
      }
    }
  }
  /**
   * sync from duoshuo
   * @return {[type]} [description]
   */
  async syncFromDuoshuo(comment){
    let postData = await this.getPostData();
    if(think.isEmpty(postData)){
      return;
    }
    let threads = Object.keys(postData);
    let index = 0;
    while(true){
      let ths = threads.slice(index, index + 10);
      index += 10;
      if(!ths.length){
        return;
      }
      let url = `http://api.duoshuo.com/threads/counts.json?short_name=${comment.name}&threads=${ths.join(',')}`;
      //think.log(`sync comments ${url}`);
      let response = await _.get(url);
      let data = JSON.parse(response.body).response;
      let promises = [];
      for(let key in data){
        if(data[key].comments === postData[key].comment_num){
          continue;
        }
        let id = postData[key].id;
        let promise = this.model('post').where({id: id}).update({comment_num: data[key].comments});
        promises.push(promise);
      }
      await Promise.all(promises);
      if(promises.length){
        await this.clearPostCache();
      }
    }
  }
  /**
   * sync from changyan
   * @return {[type]} [description]
   */
  async syncFromChangyan(comment){
    let postData = await this.getPostData();
    if(think.isEmpty(postData)){
      return;
    }
    let threads = Object.keys(postData);
    let index = 0;
    while(true){
      let ths = threads.slice(index, index + 10);
      index += 10;
      if(!ths.length){
        return;
      }
      let url = `http://changyan.sohu.com/api/2/topic/count?client_id=${comment.name}&topic_id=${ths.join(',')}`;
      //think.log(`sync comments ${url}`);
      let response = await _.get(url);
      let data = JSON.parse(response.body).result;
      let promises = [];
      for(let key in data){
        if(data[key].comments === postData[key].comment_num){
          continue;
        }
        let id = postData[key].id;
        let promise = this.model('post').where({id: id}).update({comment_num: data[key].comments});
        promises.push(promise);
      }
      await Promise.all(promises);
      if(promises.length){
        await this.clearPostCache();
      }
    }
  }
  /**
   * sync from duoshuo
   * @return {[type]} [description]
   */
  async syncFromNetease(comment){
    let postData = await this.getPostData();
    if(think.isEmpty(postData)){
      return;
    }

    let site_url = comment.site_url;
    if(site_url.slice(-1) !== '/') {
      site_url = site_url + '/';
    }

    for(let i in postData) {
      let post = postData[i];
      post.url = site_url + (post.type ? 'page/' : 'post/') + post.pathname + '.html';
    }

    let threads = Object.keys(postData);
    let index = 0;
    let url = `https://api.gentie.163.com/products/${comment.name}/threads/joincounts`;
    while(true){
      let ths = threads.slice(index, index + 50);
      if(!ths.length){return;}
      index += 50;
      // think.log(`sync comments ${url}`);
      let formData = {
        data: JSON.stringify(
          ths.map(th => ({url: postData[th].url, sourceId: null}))
        )
      };
      let resp = await _.post({url, form: formData});
      let data = JSON.parse(resp.body).data;

      let promises = [];
      for(let i=0;i<ths.length;i++) {
        let post = postData[ths[i]];
        if( data[i] === post.comment_num ) {
          continue;
        }

        let id = post.id;
        promises.push(this.model('post').where({id}).update({comment_num: data[i]}));
      }

      await Promise.all(promises);
      if(promises.length){
        await this.clearPostCache();
      }
    }
  }

  clearPostCache(){
    return think.cache('post_1', null);
  }
}
