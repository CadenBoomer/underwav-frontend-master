import { TestBed } from '@angular/core/testing';

import { Playerservice } from './playerservice';

describe('Playerservice', () => {
  let service: Playerservice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Playerservice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
