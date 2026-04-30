I used Claude Code for a lot of the coding and ended up hitting my usage limit for the session and there were a few things it got wrong. 

The first of which was that the scraper logic just did not work on it's first couple of iterations. It was unable to figure out how to scrape the price reliably until I prompted it a few times to look for bugs and suggested it to make sure it waited for the page / elements to fully render on the page. It turned out it wasn't waiting which led to inconsistent scrapping where sometimes it would work but most of the time it wouldn't. 

Some other issues included it making odd UI decisions like having to click the timestamp in order to see the records of all the times an item was scrapped so I had it change this to be it's own seperate 'History button'. It also made a mistake with which python packages to use which didn't allow the scraping functionality to work but it was able to fix this after a single prompt

Overall, Claude did pretty well for a smaller scale brand new project. I delegated a lot of control to it just given the time constraint and wanting to build something as polished as possible. 