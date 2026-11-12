package com.mycompany.myapp.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

/** Clôture de caisse d'une journée : attendu (calculé) contre constaté (compté), écart justifié. */
@Getter
@Setter
@Entity
@Table(name = "cash_closure")
public class CashClosure implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "closing_date", nullable = false, unique = true)
    private LocalDate closingDate;

    @Column(name = "expected_cash", nullable = false)
    private Long expectedCash;

    @Column(name = "counted_cash", nullable = false)
    private Long countedCash;

    @Column(name = "expected_mtn", nullable = false)
    private Long expectedMtn;

    @Column(name = "counted_mtn", nullable = false)
    private Long countedMtn;

    @Column(name = "expected_moov", nullable = false)
    private Long expectedMoov;

    @Column(name = "counted_moov", nullable = false)
    private Long countedMoov;

    @Column(name = "expected_link", nullable = false)
    private Long expectedLink;

    @Column(name = "reason", length = 300)
    private String reason;

    @Column(name = "closed_by", length = 100)
    private String closedBy;

    @Column(name = "closed_at", nullable = false)
    private Instant closedAt = Instant.now();
}
