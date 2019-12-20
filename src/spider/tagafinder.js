const to = require('await-to-js').default
const db = require('../dbConfig/example')
const puppeteer = require('puppeteer')
const setting=require('../../package.json').settings

module.exports=(word,lang,wordEN)=>{
  const url = `https://www.tagsfinder.com/en-it/?hashtag=${word}&limit=30&country=${lang}&fs=off&fp=off&fg=off&custom=instagram&type=live`
    const browser = await puppeteer.launch({
      // headless: false,
      // devtools: true,
      args: [`--proxy-server=${setting.proxy}`]
    })
    const page = await browser.newPage()
    try {
      await to(page.goto(url))
    } catch (error) {
      const one = new db.tagModel({
        word,
        lang,
        wordEN,
        list: [],
        isDone: false
      })
      await one.save()
      done()
    }
    await page.waitForSelector('.tags')
    await page.waitForSelector('.tags')
    const tags = await page.$$eval('.tag', tagList => tagList.map(item => item.innerText.replace(/x/ig, '').replace(/\n/g, '')))
    console.log('get tagList', tags.length)
    await browser.close()
    if (tags.length === 0) {
      console.log('empty tagList', wordEN)
      console.log('empty tagList url', url)
      const one = new db.tagModel({
        word,
        lang,
        wordEN,
        list: [],
        isDone: false
      })
      await one.save()
      done()
    }
    // 新录入记录
    if (type === '' || type === 'new') {
      const one = new db.tagModel({
        word,
        lang,
        wordEN,
        list: tags,
        isDone: true
      })
      await one.save()
    } else {
      // 修改记录
      await db.tagModel.findOneAndUpdate({ word, lang, wordEN }, { list: tags, isDone: true })
    }
    process.exit(0)
}