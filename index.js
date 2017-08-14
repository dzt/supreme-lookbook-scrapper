const cheerio = require('cheerio');
const request = require('request');
const base64 = require('node-base64-image');
const Twit = require('twit');
const json2csv = require('json2csv');
const _ = require('underscore');
const fs = require('fs');

var twitter = false;
var lookbook_url = 'http://www.supremenewyork.com/lookbooks';
var interval = 1000; // 1 second
var products = [];

if (twitter) {
    // Twitter API Config
    var T = new Twit({
        consumer_key: '',
        consumer_secret: '',
        access_token: '',
        access_token_secret: ''
    });
}

var start = function(callback) {
    var loop = setInterval(function() {
        request({
            url: lookbook_url,
            method: 'get'
        }, function(err, res, body) {
            console.log(res.statusCode);
            if (res.statusCode === 404) {
                console.log('Page not found yet...');
            } else if (res.statusCode === 200) {
                console.log('Page found sending tweets...');
                clearInterval(loop);
                return callback(body)
            } else {
                console.log('Page not found yet...');
            }
        });
    }, interval);
}

start(function(body) {
    if (body) {
        var $ = cheerio.load(body);
        $('#lookbook-items ul li a').each(function(i, element) {
            var items = $(this).attr('data-caption');
            var $$ = cheerio.load(items);
            $$('a').each(function(i, element) {
                var data = {
                    Name: $$(this).text(),
                    Description: null,
                    Link: 'http://www.supremenewyork.com' + $$(this).attr('href'),
                    Image: null
                }
                request({
                    url: data.Link,
                    method: 'get'
                }, function(err, res, body) {
                    var $ = cheerio.load(body)
                    data.Image = 'http:' + $('#img-main').attr('src');
                    data.Description = $('.description div p').text();
                    console.log(data)
                    var possibleDuplicate = _.findWhere(products, {
                        Name: data.Name,
                    });
                    if (possibleDuplicate === undefined) {
                        products.push(data)
                        if (twitter) {
                            post(data);
                        }
                    }
                });
            });
        });
        setTimeout(function() {
            console.log(products)
            var csv = json2csv({
                data: products,
                fields: ['Name', 'Description', 'Link', 'Image']
            });
            fs.writeFile('result.csv', csv, function(err) {
                if (err) throw err;
                console.log('writeFile successful');
                setTimeout(function() {
                  process.exit()
                }, 35000);
            });
        }, 10000);
    }
});

function post(data) {

    base64.encode(data.Image, {
        string: true
    }, function(err, image) {
        if (err) {
            console.log('error', err)
        }
        publish(image)
    });

    var altText = `${data.Name}\n${data.Link}`

    function publish(img) {
        console.log(`Tweeting for "${data.Name}"`)

        T.post('media/upload', {
            media_data: img,
            alt_text: {
                text: altText
            }
        }, function(err, data, response) {

            if (err) {
                return console.log('error', err)
            }

            var mediaIdStr = data.media_id_string
            var meta_params = {
                media_id: mediaIdStr,
                alt_text: {
                    text: altText
                }
            }

            T.post('media/metadata/create', meta_params, function(err, data, response) {
                if (!err) {
                    var params = {
                        status: altText,
                        media_ids: [mediaIdStr]
                    }

                    T.post('statuses/update', params, function(err, data, response) {
                        if (err) {
                            return console.log('error', err)
                        }
                        return console.log('success', `Tweet Sent: https://twitter.com/${data.user.screen_name}/status/${data.id_str}`)
                    })
                } else {
                    return console.log('error', err)
                }
            })

        })
    }
}
