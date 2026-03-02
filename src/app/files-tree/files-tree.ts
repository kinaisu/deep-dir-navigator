import { ChangeDetectionStrategy, Component, inject, Injectable, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import {
  MatTreeModule,
} from "@angular/material/tree";
import { FlatTreeControl } from '@angular/cdk/tree';
import { CollectionViewer, DataSource, SelectionChange } from '@angular/cdk/collections';
import { BehaviorSubject, merge, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

/**
 * Опис вузла, що приходить з fs.json
 */
interface FsNode {
  type: 'file' | 'folder';
  children?: { [key: string]: FsNode };
}

/**
 * Опис плоского вузла дерева для відображення.
 */
class DynamicFlatNode {
  constructor(
    public item: string,
    public level = 1,
    public expandable = false,
    public type: 'file' | 'folder' = 'file',
    public isLoading = signal(false),
  ) {}
}

/**
 * Сервіс для роботи з json-server.
 */
@Injectable({ providedIn: 'root' })
export class DynamicDatabase {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/root';

  private fullData: any = null;

  /** Отримання початкових даних (рівень root) */
  initialData(): Observable<DynamicFlatNode[]> {
    return this.http.get<any>(this.API_URL).pipe(
      tap(data => this.fullData = data),
      map(data => {
        return Object.keys(data).map(key =>
          new DynamicFlatNode(key, 0, data[key].type === 'folder', data[key].type)
        );
      })
    );
  }

  /** Пошук дітей для конкретного вузла у вкладеній структурі JSON */
  getChildren(nodeName: string): DynamicFlatNode[] | undefined {
    if (!this.fullData) return undefined;

    const findNode = (obj: any, target: string): any => {
      if (obj[target]) return obj[target];
      for (const key in obj) {
        if (obj[key].children) {
          const found = findNode(obj[key].children, target);
          if (found) return found;
        }
      }
      return null;
    };

    const target = findNode(this.fullData, nodeName);
    if (target && target.children) {
      return Object.keys(target.children).map(key => {
        const child = target.children[key];
        return new DynamicFlatNode(key, 0, child.type === 'folder', child.type);
      });
    }
    return undefined;
  }
}

/**
 * Джерело даних для дерева.
 */
export class DynamicDataSource implements DataSource<DynamicFlatNode> {
  dataChange = new BehaviorSubject<DynamicFlatNode[]>([]);

  get data(): DynamicFlatNode[] { return this.dataChange.value; }
  set data(value: DynamicFlatNode[]) {
    this._treeControl.dataNodes = value;
    this.dataChange.next(value);
  }

  constructor(
    private _treeControl: FlatTreeControl<DynamicFlatNode>,
    private _database: DynamicDatabase,
  ) {}

  connect(collectionViewer: CollectionViewer): Observable<DynamicFlatNode[]> {
    this._treeControl.expansionModel.changed.subscribe(change => {
      const selectionChange = change as SelectionChange<DynamicFlatNode>;
      if (selectionChange.added || selectionChange.removed) {
        this.handleTreeControl(selectionChange);
      }
    });
    return merge(collectionViewer.viewChange, this.dataChange).pipe(map(() => this.data));
  }

  disconnect(collectionViewer: CollectionViewer): void {}

  handleTreeControl(change: SelectionChange<DynamicFlatNode>) {
    if (change.added) {
      change.added.forEach(node => this.toggleNode(node, true));
    }
    if (change.removed) {
      // Сортуємо в зворотному порядку, щоб коректно видаляти вкладені елементи
      change.removed.slice().reverse().forEach(node => this.toggleNode(node, false));
    }
  }

  toggleNode(node: DynamicFlatNode, expand: boolean) {
    const index = this.data.indexOf(node);
    if (index < 0) return;

    if (expand) {
      node.isLoading.set(true);
      setTimeout(() => {
        const children = this._database.getChildren(node.item);
        if (children) {
          const nodes = children.map(child => {
            child.level = node.level + 1;
            return child;
          });
          this.data.splice(index + 1, 0, ...nodes);
        }
        this.dataChange.next(this.data);
        node.isLoading.set(false);
      }, 300);
    } else {
      // ВИПРАВЛЕННЯ РЕКУРСІЇ:
      // Спочатку рахуємо скільки елементів треба видалити з плоского списку
      let count = 0;
      for (let i = index + 1; i < this.data.length && this.data[i].level > node.level; i++, count++) {}

      if (count > 0) {
        // Видаляємо вузли з масиву ПЕРЕД тим як викликати collapseDescendants.
        // Це розриває цикл, бо наступні виклики toggleNode для дітей
        // повернуться на початку через index < 0.
        this.data.splice(index + 1, count);
        this.dataChange.next(this.data);

        // Тепер безпечно скидаємо стан розгортання в моделі для підпапок
        this._treeControl.collapseDescendants(node);
      }
    }
  }
}

@Component({
  selector: 'app-files-tree',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTreeModule
  ],
  templateUrl: './files-tree.html',
  styleUrl: './files-tree.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilesTree implements OnInit {
  private database = inject(DynamicDatabase);

  treeControl: FlatTreeControl<DynamicFlatNode>;
  dataSource: DynamicDataSource;

  constructor() {
    this.treeControl = new FlatTreeControl<DynamicFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new DynamicDataSource(this.treeControl, this.database);
  }

  ngOnInit() {
    this.database.initialData().subscribe(nodes => {
      this.dataSource.data = nodes;
    });
  }

  getLevel = (node: DynamicFlatNode) => node.level;
  isExpandable = (node: DynamicFlatNode) => node.expandable;
  hasChild = (_: number, _nodeData: DynamicFlatNode) => _nodeData.expandable;
}
