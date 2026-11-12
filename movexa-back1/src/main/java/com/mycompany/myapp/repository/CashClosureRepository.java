package com.mycompany.myapp.repository;

import com.mycompany.myapp.domain.CashClosure;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashClosureRepository extends JpaRepository<CashClosure, Long> {
    Optional<CashClosure> findOneByClosingDate(LocalDate closingDate);
}
