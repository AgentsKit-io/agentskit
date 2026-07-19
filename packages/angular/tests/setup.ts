import 'zone.js'
import 'zone.js/testing'
import { getTestBed } from '@angular/core/testing'
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing'

// Initialise the Angular testing environment once for all component specs.
getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting())
