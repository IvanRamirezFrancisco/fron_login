import { Pipe, PipeTransform } from '@angular/core';
import { TableStats } from '../services/slow-queries.service';

/**
 * Filtra tablas con escaneos secuenciales excesivos.
 *
 * Criterio: seqScan > 1000 Y liveRows > 100
 * Estas tablas son candidatas prioritarias para agregar índices.
 *
 * Uso: `tableStats | heavySeqScan`
 */
@Pipe({
  name: 'heavySeqScan',
  standalone: true,
  pure: true,
})
export class HeavySeqScanPipe implements PipeTransform {
  transform(tables: TableStats[] | null): TableStats[] {
    if (!tables) return [];
    return tables.filter(t => t.seqScan > 1000 && t.liveRows > 100);
  }
}
