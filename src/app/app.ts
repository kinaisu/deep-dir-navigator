import {Component} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatButtonModule} from '@angular/material/button';
import {MatTreeModule} from '@angular/material/tree';
import {Search} from './search/search';
import {FilesTree} from './files-tree/files-tree';

@Component({
  selector: 'app-root',
  imports: [
    MatSidenavModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTreeModule,
    MatButtonModule,
    MatProgressBarModule,
    RouterOutlet,
    Search,
    FilesTree
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {

}
