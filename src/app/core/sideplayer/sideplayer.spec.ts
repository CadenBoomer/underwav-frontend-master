import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sideplayer } from './sideplayer';

describe('Sideplayer', () => {
  let component: Sideplayer;
  let fixture: ComponentFixture<Sideplayer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sideplayer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sideplayer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
