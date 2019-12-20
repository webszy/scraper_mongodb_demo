const rp = require('request-promise')
const cheerio = require('cheerio')
const to = require('await-to-js').default
const useragentFromSeed = require('useragent-from-seed')
const db = require('../dbConfig/example')
const Crawler = require('crawler')
const Scraper = require('images-scraper')
const { downloadFile } = require('../common')
const setting = require('../../package.json').settings

const StarSpider = new Crawler({
  rateLimit: 4 * 1000,
  userAgent: useragentFromSeed(),
  proxy: setting.proxy,
  callback: async function (error, res, done) {
    console.log('---------- fetched one Person      ' + res.options.addr)
    if (error || res.statusCod === 404) {
      console.log(error || res.statusCod)
      done()
    } else {
      const $ = res.$
      let name = $('#name-overview h1').eq(0).text().trim()
      if (/\n/g.test(name)) {
        name = name.split('\n')[0].trim()
      }
      let occupation = $('#name-overview  p').eq(0).text().split('|')
      occupation = occupation.map(item => item.replace(/\n/g, '').trim())
      occupation = occupation.length > 1 ? occupation.join(',') : occupation[0]
      let birthday = $('time')
      let sign = ''
      if (birthday.length > 0) {
        birthday = birthday.eq(0).attr('datetime').split('-')
        if (birthday[1].length === 1) {
          birthday[1] = '0' + birthday[1]
        }
        if (birthday[2].length === 1) {
          birthday[2] = '0' + birthday[2]
        }
      } else {
        birthday = ''
      }
      console.log('birthday and sign', birthday, sign)
      const detail = $('#personal-details')
      let height = ''
      if (detail.length > 0) {
        detail.find('h3').each((i, e) => {
          if ($(e).text().trim().toLowerCase().indexOf('height') > -1) {
            height = $(e).next().text().trim()
          }
        })
      }
      console.log('detail - height', height)

      const didYou = $('#did-you-know')
      let nickName = ''
      if (didYou.length > 0) {
        didYou.find('h3').each((i, e) => {
          if ($(e).text().trim().toLowerCase() === 'nickname') {
            nickName = $(e).next().text()
          }
          if ($(e).text().toLowerCase() === 'star sign') {
            if ($(e).next().text().trim().toLowerCase() !== sign.toLowerCase()) {
              sign = $(e).next().text().trim()
            }
          }
        })
      }
      console.log('TCL: nickName', nickName)
      // 获取原始大图
      console.log('begin scraper google images')
      const scraper = new Scraper.Google({
        keyword: name,
        limit: 30,
        puppeteer: {
          args: [`--proxy-server=${setting.proxy}`]
        },
        advanced: {
          imgType: 'face',
          resolution: undefined,
          color: undefined
        }
      })
      let result = await scraper.start()
      result = result.filter(item => {
        const isBase64 = item.url.startsWith('data:')
        const notfb = item.url.indexOf('fbsbx.com') === -1
        const notgif = item.url.indexOf('.gif') === -1
        const wrongPic = ['maxresdefault'].every(e => item.url.toLowerCase().indexOf(e) === -1)
        return !isBase64 && notfb && wrongPic && notgif
      })
      const starPhto = result[0] ? result[0].url : ''
      console.log('TCL: starPhto', starPhto)
      // await db.imdbModel.findByIdAndUpdate(onePerson._id, { face_url: result[0].url })
      // if (onePerson.birthday !== '' && onePerson.sign === '') {
      //   const b = birthday.split('-')
      //   const sign2 = getSign(b[1], b[2])
      //   await db.imdbModel.findByIdAndUpdate(onePerson._id, { sign: sign2 })
      // }
      // if (onePerson.name !== onePerson.englishName) {
      //   await db.imdbModel.findByIdAndUpdate(onePerson._id, { englishName: onePerson.name })
      // }
      // 获取简介
      console.log('begin fetch bio')
      const bioURL = 'https://m.imdb.com' + $('#name-overview .media-body a').attr('href')
      const [err, res1] = await to(rp.get(bioURL, requestOptions))
      let bio = ''
      if (err) {
        console.log('get bio error')
      } else {
        const $$ = cheerio.load(res1.body)
        bio = $$('#name-bio p').text().replace(/\n/g, '').trim()
      }
      console.log('begin detect sex')
      let sex = ''
      if (starPhto !== '') {
        const [err2, res2] = await to(rp({
          url: 'https://api-cn.faceplusplus.com/facepp/v3/detect',
          method: 'post',
          headers: {
            'content-type': 'multipart/form-data'
          },
          formData: {
            api_key: '请自己去face++申请key',
            api_secret: '请自己去face++申请key',
            image_url: starPhto,
            return_attributes: 'gender'
          }
        }))
        if (!err2 && res2 !== '') {
          const faceData = JSON.parse(res2)
          if (faceData.faces.length > 0) {
            sex = faceData.faces[0].attributes.gender.value
          }
        }
      }
      console.log('detect end sex is ' + sex)
      const user = {
        name,
        englishName: name,
        nickName,
        face_url: starPhto,
        occupation,
        sign,
        height,
        birthday: birthday !== '' ? birthday.join('-') : '',
        content: { description: bio },
        country: '',
        sex: sex.toLowerCase(),
        url: res.options.addr
      }
      console.log('TCL: user', user)
      const one = new db.dataModel(user)
      const saved = await one.save()
      console.log('----------   ' + saved._id + ' save succeed and begin download still has  ' + StarSpider.queueSize)
      if (saved._id && starPhto !== '') {
        await downloadFile(saved._id, starPhto)
      }
      if (StarSpider.queueSize === 1) {
        console.log('all task down')
        process.exit(0)
      }
      done()
    }
  }
})
const getStarList = async function (page) {
  // 链接的start每次加50
  if (page <= 0) { page = 1 }
  const url = `https://www.imdb.com/search/name/?gender=male,female&start=${page * 50 + 1}&ref_=rlm`
  const [err, res] = await to(rp.get(url, requestOptions))
  if (err) {
    console.log('TCL: err', err)
    return setTimeout(getStarList, 1000)
  }
  const $ = cheerio.load(res.body)
  let list = []
  $('#main .article .lister-item-header a').each((i, e) => {
    const href = $(e).attr('href').split('/')
    const id = href[href.length - 1]
    const uri = 'https://m.imdb.com/name/' + id + '/'
    list.push({
      uri,
      addr: uri
    })
  })
  //不爬取重复记录
  for (const k of list) {
    const result = await db.dataModel.find({ url: k.addr }).countDocuments()
    if (result === 0) {
      StarSpider.queue(k)
    }
  }
  console.log('合计总爬取数', StarSpider.queueSize)
  if (list.length === 0) {
    process.exit(0)
  }
}
module.exports = getStarList
