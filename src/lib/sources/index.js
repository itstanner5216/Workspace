import { GoogleProvider } from './google.js'
import { BraveProvider } from './brave.js'
import { YandexProvider } from './yandex.js'
import { AdultMediaProvider } from './adultmedia.js'
import { RedditProvider } from './reddit.js'
import { SiteProvider } from './site.js'

// Export providers array
export const providers = [
  new GoogleProvider(),
  new BraveProvider(),
  new YandexProvider(),
  new AdultMediaProvider(),
  new RedditProvider(),
  new SiteProvider()
]
