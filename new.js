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
            console.log(path.resolve(__dirname, './百度实时热点1.json'))
            fs.writeFileSync(path.resolve(__dirname, './百度实时热点1.json'), JSON.stringify(bdTimeHot, null, 2));
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
    $('#sanRoot > main > div.container.right-container_2EFJr > div > div:nth-child(2) > div').each(function () {
        if ($(this).find('div.content_1YWBm > a').html()) {
            result.push({
                rank: $(this).find('div.trend_2RttY.hide-icon > div.hot-index_1Bl1a').text(),
                keyword: $(this).find('div.content_1YWBm > a').text(),
                href: $(this).find('div.content_1YWBm > a').attr('href'),
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

