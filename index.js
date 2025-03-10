const puppeteer = require('puppeteer');
let fs = require('fs');
const path = require('path');
async function main() {
    const bdWeekUrl = 'http://top.baidu.com/buzz?b=42&c=513&fr=topbuzz_b341_c513'
    const bdTodayUrl = 'http://top.baidu.com/buzz?b=341&c=513&fr=topbuzz_b1_c513'
    const bdTimeUrl = 'http://top.baidu.com/buzz?b=1&c=513&fr=topbuzz_b341_c513'
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '–disable-gpu',
            '–disable-dev-shm-usage',
            '–disable-setuid-sandbox',
            '–no-first-run',
            '–no-sandbox',
            '–no-zygote',
            '–single-process',
            '-disable-extensions'
        ],
    });
    const page = await browser.newPage();
    try {
        const blockTypes = new Set(['image', 'media', 'font']);
        await page.setRequestInterception(true); //开启请求拦截
        page.on('request', request => {
            const type = request.resourceType();
            const shouldBlock = blockTypes.has(type);
            if (shouldBlock) {
                //直接阻止请求
                return request.abort();
            } else {
                //对请求重写
                return request.continue({
                    //可以对 url，method，postData，headers 进行覆盖
                    headers: Object.assign({}, request.headers(), {
                        'puppeteer-test': 'true'
                    })
                });
            }
        });
        // 百度七日热点
        await page.goto(bdWeekUrl);
        await page
            .mainFrame()
            .addScriptTag({
                url: 'https://cdn.bootcss.com/jquery/3.2.0/jquery.min.js'
            })
        let bdWeekHot = await page.evaluate(getBdHot);
        if (bdWeekHot.length > 0) {
            fs.writeFileSync(path.resolve(__dirname, './百度七日热点.json'), JSON.stringify(bdWeekHot, null, 2));
        }
        // 百度今日热点
        await page.goto(bdTodayUrl);
        await page
            .mainFrame()
            .addScriptTag({
                url: 'https://cdn.bootcss.com/jquery/3.2.0/jquery.min.js'
            })
        let bdToadyHot = await page.evaluate(getBdHot);
        if (bdToadyHot.length > 0) {
            fs.writeFileSync(path.resolve(__dirname, './百度今日热点.json'), JSON.stringify(bdToadyHot, null, 2));
        }
        // 百度实时热点
        await page.goto(bdTimeUrl);
        await page
            .mainFrame()
            .addScriptTag({
                url: 'https://cdn.bootcss.com/jquery/3.2.0/jquery.min.js'
            })
        let bdTimeHot = await page.evaluate(getBdHot);
        console.log(bdTimeHot)
        if (bdTimeHot.length > 0) {
            console.log(path.resolve(__dirname, './百度实时热点.json'))
            fs.writeFileSync(path.resolve(__dirname, './百度实时热点.json'), JSON.stringify(bdTimeHot, null, 2));
        }
        console.log('-------爬取成功--------');
        await page.close();
        await browser.close();
    } catch (error) {
        console.log(error);
        console.log('-------爬取失败--------');
        await page.close();
        await browser.close();
    }
};
function getBdHot() {
    let result = []
    $('.list-table tbody tr:not(:first-child)').each(function () {
        if ($(this).find('.keyword .list-title').html()) {
            result.push({
                rank: $(this).find('.num-top').html() ? $(this).find('.num-top').html() : $(this).find('.num-normal').html(),
                keyword: $(this).find('.keyword .list-title').html(),
                href: $(this).find('.keyword .list-title').attr('href'),
            })
        }

    })
    return result
}
const schedule = require('node-schedule');
// 定义规则
let rule = new schedule.RecurrenceRule();
rule.second = [0, 10, 20, 30, 40, 50]; // 每隔 10 秒爬取一次
// 启动任务
schedule.scheduleJob(rule, () => {
    main()
});

