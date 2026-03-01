import { Component } from '@angular/core';
import {MatFormField, MatInput, MatPrefix} from "@angular/material/input";
import {MatIcon} from "@angular/material/icon";

@Component({
  selector: 'app-search',
    imports: [
        MatFormField,
        MatIcon,
        MatInput,
        MatPrefix
    ],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class Search {

}
